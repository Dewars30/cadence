import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { CanvasNode } from "../domain/types";

export async function createCanvasNode(
  project_id: string,
  node_type: CanvasNode["node_type"],
  x = 0,
  y = 0,
  w = 400,
  h = 280,
  ref_id: string | null = null
) {
  const db = await getDb();
  const id = newId("node");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO canvas_node (id, project_id, node_type, ref_id, x, y, w, h, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, project_id, node_type, ref_id, x, y, w, h, created_at]
  );
  return {
    id,
    project_id,
    node_type,
    ref_id,
    x,
    y,
    w,
    h,
    created_at,
  } satisfies CanvasNode;
}

export async function listCanvasNodes(project_id: string) {
  const db = await getDb();
  return db.select<CanvasNode[]>(
    "SELECT * FROM canvas_node WHERE project_id = ? ORDER BY created_at ASC",
    [project_id]
  );
}

export async function updateCanvasNodePosition(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const db = await getDb();
  await db.execute("UPDATE canvas_node SET x = ?, y = ?, w = ?, h = ? WHERE id = ?", [
    x,
    y,
    w,
    h,
    id,
  ]);
}

export async function deleteCanvasNode(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM canvas_node WHERE id = ?", [id]);
}
