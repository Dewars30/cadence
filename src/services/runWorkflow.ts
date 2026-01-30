import { WorkflowPhase, isFinalPhase, nextPhase } from "../domain/phase";
import { buildRunContext } from "./contextBuilder";
import type { LLMProvider } from "./llmProvider";
import { addRunStep, createRun, getRun, listRunSteps, setRunStatus, updateRunPhase } from "./runService";
import { reviseWithPatches } from "./workflow/phases/reviseWithPatches";
import type { IRTarget } from "../domain/irPatch";
import type { ArtifactIR } from "../domain/artifactIR";
import type { ArtifactIRRepairProvider } from "./artifactIRService";
import type { RevisionProvider, RevisionRecord } from "../domain/revisionLog";
import { parseRegenTokens } from "./revision/regenTokens";
import { appendRevisionRecord, computeIRHash } from "./revision/provenance";
import { nowIso } from "./utils";

type RunStartParams = {
  projectId: string;
  prompt: string;
  artifactId?: string | null;
  provider: LLMProvider;
  artifactIds?: string[];
  conversationIds?: string[];
};

type RunAdvanceParams = {
  runId: string;
  prompt: string;
  provider: LLMProvider;
  artifactIds?: string[];
  conversationIds?: string[];
};

export async function startRun(params: RunStartParams) {
  const run = await createRun(params.projectId, "Understanding", params.artifactId ?? null);
  const context = await buildRunContext({
    projectId: params.projectId,
    artifactIds: params.artifactIds,
    conversationIds: params.conversationIds,
  });
  const history = [];
  const output = await params.provider.generate({
    phase: "Understanding",
    prompt: params.prompt,
    context,
    history,
  });
  await addRunStep(
    run.id,
    "Understanding",
    JSON.stringify({ prompt: params.prompt, context }),
    output.output_json,
  );
  return run;
}

export async function advanceRun(params: RunAdvanceParams) {
  const run = await getRun(params.runId);
  if (!run) throw new Error("Run not found.");
  if (run.status === "complete" || run.status === "canceled") return run;

  const currentPhase = run.phase as WorkflowPhase;
  const next = nextPhase(currentPhase);
  if (!next) {
    await setRunStatus(run.id, "complete", true);
    return { ...run, status: "complete", ended_at: new Date().toISOString() };
  }

  await updateRunPhase(run.id, next);
  const context = await buildRunContext({
    projectId: run.project_id,
    artifactIds: params.artifactIds,
    conversationIds: params.conversationIds,
  });
  const steps = await listRunSteps(run.id);
  const history = steps;
  const output = await params.provider.generate({
    phase: next,
    prompt: params.prompt,
    context,
    history,
  });
  await addRunStep(run.id, next, JSON.stringify({ prompt: params.prompt, context }), output.output_json);

  if (isFinalPhase(next)) {
    await setRunStatus(run.id, "complete", true);
    return { ...run, phase: next, status: "complete", ended_at: new Date().toISOString() };
  }

  return { ...run, phase: next };
}

export async function pauseRun(runId: string) {
  const run = await getRun(runId);
  if (!run) throw new Error("Run not found.");
  await setRunStatus(run.id, "paused");
  return { ...run, status: "paused" };
}

type ReviseArtifactParams = {
  projectId: string;
  ir: ArtifactIR;
  instruction: string;
  target: IRTarget;
  provider: LLMProvider;
  repairProvider: ArtifactIRRepairProvider;
  providerName: RevisionProvider;
  providerModel?: string | null;
};

function truncateInstruction(instruction: string, max = 500) {
  if (instruction.length <= max) return instruction;
  return instruction.slice(0, max);
}

function getProviderModel(provider: LLMProvider, fallback?: string | null) {
  if (fallback) return fallback;
  const candidate = (provider as { model?: string }).model;
  return typeof candidate === "string" ? candidate : null;
}

export async function reviseArtifactWithPatches(params: ReviseArtifactParams) {
  const { mode, sanitizedInstruction, warnings, allowHeadingRenames } = parseRegenTokens(
    params.instruction,
  );
  warnings.forEach((warning) => console.warn(`[Cadence] ${warning}`));

  const irHashBefore = await computeIRHash(params.ir);
  const instruction = sanitizedInstruction;
  const revisionId = globalThis.crypto?.randomUUID?.() ?? `rev_${Date.now()}`;
  const timestamp = nowIso();
  const providerModel = getProviderModel(params.provider, params.providerModel ?? null);

  let record: RevisionRecord | null = null;
  try {
    const result = await reviseWithPatches({
      ir: params.ir,
      instruction,
      target: params.target,
      provider: params.provider,
      repairProvider: params.repairProvider,
      revisionMode: mode,
      allowHeadingRenames,
    });
    const boundedHeadingRenames =
      result.headingRenames && result.headingRenames.length > 0
        ? result.headingRenames.slice(0, 20)
        : undefined;
    const irHashAfter = await computeIRHash(result.ir);
    const validation = result.repaired || result.outlineRepaired ? "repaired" : "passed";
    record = {
      revisionId,
      timestamp,
      mode,
      target: mode === "patch" ? params.target : "artifact",
      instruction: truncateInstruction(instruction),
      provider: params.providerName,
      model: providerModel,
      patchCount: result.patches.length,
      validation,
      headingRenames: boundedHeadingRenames,
      irHashBefore,
      irHashAfter,
    };
    await appendRevisionRecord(params.projectId, record);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Revision failed.";
    record = {
      revisionId,
      timestamp,
      mode,
      target: mode === "patch" ? params.target : "artifact",
      instruction: truncateInstruction(instruction),
      provider: params.providerName,
      model: providerModel,
      patchCount: 0,
      validation: "failed",
      errors: [error],
      irHashBefore,
      irHashAfter: irHashBefore,
    };
    await appendRevisionRecord(params.projectId, record);
    throw err;
  }
}
