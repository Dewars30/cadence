import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Run, RunStep } from "../domain/types";
import type { WorkflowPhase } from "../domain/phase";

export async function createRun(project_id: string, phase: WorkflowPhase, artifact_id?: string | null) {
  const db = await getDb();
  const id = newId("run");
  const started_at = nowIso();
  await db.execute(
    "INSERT INTO run (id, project_id, artifact_id, phase, status, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, project_id, artifact_id ?? null, phase, "running", started_at, null],
  );
  return {
    id,
    project_id,
    artifact_id: artifact_id ?? null,
    phase,
    status: "running",
    started_at,
    ended_at: null,
  } satisfies Run;
}

export async function getRun(id: string) {
  const db = await getDb();
  const rows = await db.select<Run[]>("SELECT * FROM run WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function updateRunPhase(id: string, phase: WorkflowPhase) {
  const db = await getDb();
  await db.execute("UPDATE run SET phase = ? WHERE id = ?", [phase, id]);
}

export async function setRunStatus(id: string, status: Run["status"], ended = false) {
  const db = await getDb();
  const ended_at = ended ? nowIso() : null;
  await db.execute("UPDATE run SET status = ?, ended_at = ? WHERE id = ?", [status, ended_at, id]);
}

export async function addRunStep(run_id: string, phase: WorkflowPhase, input_json: string, output_json: string) {
  const db = await getDb();
  const id = newId("step");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO run_step (id, run_id, phase, input_json, output_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, run_id, phase, input_json, output_json, created_at],
  );
  return { id, run_id, phase, input_json, output_json, created_at } satisfies RunStep;
}

export async function listRunSteps(run_id: string) {
  const db = await getDb();
  return db.select<RunStep[]>("SELECT * FROM run_step WHERE run_id = ? ORDER BY created_at ASC", [
    run_id,
  ]);
}
