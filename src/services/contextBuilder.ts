import { getProject } from "./projectService";
import { listArtifacts } from "./artifactService";
import { listVersions } from "./versionService";
import { listConversations } from "./conversationService";
import { listMessages } from "./messageService";
import type { ArtifactIR, ArtifactBlock } from "../domain/artifactIR";
import type { IRTarget } from "../domain/irPatch";

export type RunContext = {
  project: {
    id: string;
    name: string;
    readme: string;
  };
  artifacts: Array<{
    id: string;
    title: string;
    type: string;
    current_version_id: string | null;
    latest_version_json: string | null;
  }>;
  conversations: Array<{
    id: string;
    title: string;
    summary: string;
    recent_messages: Array<{ role: string; content: string }>;
  }>;
};

export async function buildRunContext(params: {
  projectId: string;
  artifactIds?: string[];
  conversationIds?: string[];
}): Promise<RunContext> {
  const project = await getProject(params.projectId);
  if (!project) {
    throw new Error("Project not found for run context.");
  }

  const allArtifacts = await listArtifacts(project.id);
  const selectedArtifacts = params.artifactIds
    ? allArtifacts.filter((a) => params.artifactIds?.includes(a.id))
    : allArtifacts;

  const artifacts = await Promise.all(
    selectedArtifacts.map(async (artifact) => {
      const versions = await listVersions(artifact.id);
      const latest = versions[versions.length - 1];
      return {
        id: artifact.id,
        title: artifact.title,
        type: artifact.artifact_type,
        current_version_id: artifact.current_version_id,
        latest_version_json: latest?.content_json ?? null,
      };
    }),
  );

  const allConversations = await listConversations(project.id);
  const selectedConversations = params.conversationIds
    ? allConversations.filter((c) => params.conversationIds?.includes(c.id))
    : allConversations;

  const conversations = await Promise.all(
    selectedConversations.map(async (conversation) => {
      const messages = await listMessages(conversation.id);
      const recent = messages.slice(-6).map((msg) => ({ role: msg.role, content: msg.content }));
      return {
        id: conversation.id,
        title: conversation.title,
        summary: conversation.summary,
        recent_messages: recent,
      };
    }),
  );

  return {
    project: { id: project.id, name: project.name, readme: project.readme },
    artifacts,
    conversations,
  };
}

export type RevisionContext = {
  target: IRTarget;
  block?: ArtifactBlock;
  section?: {
    heading: ArtifactBlock & { type: "heading" };
    blocks: ArtifactBlock[];
  };
  previousHeading?: ArtifactBlock;
  nextHeading?: ArtifactBlock;
};

function resolveSectionRange(blocks: ArtifactBlock[], sectionId: string) {
  const start = blocks.findIndex((block) => block.id === sectionId);
  if (start < 0) throw new Error(`Revision target section not found: ${sectionId}`);
  const heading = blocks[start];
  if (heading.type !== "heading") {
    throw new Error(`Revision section target must reference a heading block id: ${sectionId}`);
  }
  const level = heading.level;
  let end = blocks.length - 1;
  for (let i = start + 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= level) {
      end = i - 1;
      break;
    }
  }
  return { start, end, heading };
}

export function buildRevisionContext(ir: ArtifactIR, target: IRTarget): RevisionContext {
  const blocks = ir.blocks;
  if (target.kind === "block") {
    const index = blocks.findIndex((block) => block.id === target.id);
    if (index < 0) throw new Error(`Revision target block not found: ${target.id}`);
    let previousHeading: ArtifactBlock | undefined;
    let nextHeading: ArtifactBlock | undefined;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (blocks[i].type === "heading") {
        previousHeading = blocks[i];
        break;
      }
    }
    for (let i = index + 1; i < blocks.length; i += 1) {
      if (blocks[i].type === "heading") {
        nextHeading = blocks[i];
        break;
      }
    }
    return { target, block: blocks[index], previousHeading, nextHeading };
  }

  const section = resolveSectionRange(blocks, target.id);
  let previousHeading: ArtifactBlock | undefined;
  let nextHeading: ArtifactBlock | undefined;
  for (let i = section.start - 1; i >= 0; i -= 1) {
    if (blocks[i].type === "heading") {
      previousHeading = blocks[i];
      break;
    }
  }
  for (let i = section.end + 1; i < blocks.length; i += 1) {
    if (blocks[i].type === "heading") {
      nextHeading = blocks[i];
      break;
    }
  }
  return {
    target,
    section: { heading: section.heading, blocks: blocks.slice(section.start, section.end + 1) },
    previousHeading,
    nextHeading,
  };
}
