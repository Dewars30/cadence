import { getProject } from "./projectService";
import { listArtifacts } from "./artifactService";
import { listVersions } from "./versionService";
import { listConversations } from "./conversationService";
import { listMessages } from "./messageService";

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
