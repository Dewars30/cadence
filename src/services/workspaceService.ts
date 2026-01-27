import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Workspace } from "../domain/types";

export async function createWorkspace(name: string) {
  const db = await getDb();
  const id = newId("ws");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO workspace (id, name, created_at, settings_json) VALUES (?, ?, ?, ?)",
    [id, name, created_at, "{}"]
  );
  return { id, name, created_at, settings_json: "{}" } satisfies Workspace;
}

export async function listWorkspaces() {
  const db = await getDb();
  return db.select<Workspace[]>("SELECT * FROM workspace ORDER BY created_at ASC");
}

export async function getWorkspace(id: string) {
  const db = await getDb();
  const rows = await db.select<Workspace[]>("SELECT * FROM workspace WHERE id = ?", [id]);
  return rows[0] ?? null;
}
