import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Project } from "../domain/types";

export async function createProject(workspace_id: string, name: string) {
  const db = await getDb();
  const id = newId("proj");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO project (id, workspace_id, name, readme, ai_context_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, workspace_id, name, "", "{}", created_at]
  );
  return {
    id,
    workspace_id,
    name,
    readme: "",
    ai_context_json: "{}",
    created_at,
  } satisfies Project;
}

export async function listProjects(workspace_id: string) {
  const db = await getDb();
  return db.select<Project[]>(
    "SELECT * FROM project WHERE workspace_id = ? ORDER BY created_at ASC",
    [workspace_id]
  );
}

export async function getProject(id: string) {
  const db = await getDb();
  const rows = await db.select<Project[]>("SELECT * FROM project WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function updateProjectReadme(id: string, readme: string) {
  const db = await getDb();
  await db.execute("UPDATE project SET readme = ? WHERE id = ?", [readme, id]);
}
