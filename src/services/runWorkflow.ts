import { WorkflowPhase, isFinalPhase, nextPhase } from "../domain/phase";
import { buildRunContext } from "./contextBuilder";
import type { LLMProvider } from "./llmProvider";
import { addRunStep, createRun, getRun, listRunSteps, setRunStatus, updateRunPhase } from "./runService";

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
