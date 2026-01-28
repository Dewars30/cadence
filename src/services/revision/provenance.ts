import type { ArtifactIR } from "../../domain/artifactIR";
import type { RevisionLog, RevisionRecord } from "../../domain/revisionLog";
import { getProject, updateProjectAIContext } from "../projectService";

type ProjectAIContext = Record<string, unknown> & {
  revisionLog?: RevisionLog;
};
const MAX_RECORDS = 200;

function parseAIContext(raw: string | null | undefined): ProjectAIContext {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ProjectAIContext;
    }
  } catch {
    // fall through
  }
  return {};
}

function normalizeRevisionLog(value: unknown): RevisionLog {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const records = (value as RevisionLog).records;
    if (Array.isArray(records)) {
      return { records: records.filter(Boolean) as RevisionRecord[] };
    }
  }
  return { records: [] };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const sorted: Record<string, unknown> = {};
    entries.forEach(([key, val]) => {
      sorted[key] = sortValue(val);
    });
    return sorted;
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

async function sha256Hex(data: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(data);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const { createHash } = await import("crypto");
  return createHash("sha256").update(data).digest("hex");
}

export async function computeIRHash(ir: ArtifactIR): Promise<string> {
  return sha256Hex(stableStringify(ir));
}

export async function getRevisionLog(projectId: string): Promise<RevisionLog> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");
  const context = parseAIContext(project.ai_context_json);
  return normalizeRevisionLog(context.revisionLog);
}

export async function appendRevisionRecord(projectId: string, record: RevisionRecord) {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");
  const context = parseAIContext(project.ai_context_json);
  const revisionLog = normalizeRevisionLog(context.revisionLog);
  revisionLog.records.push(record);
  if (revisionLog.records.length > MAX_RECORDS) {
    revisionLog.records = revisionLog.records.slice(-MAX_RECORDS);
  }
  const updated: ProjectAIContext = { ...context, revisionLog };
  await updateProjectAIContext(projectId, JSON.stringify(updated));
}
