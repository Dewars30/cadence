import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Conversation } from "../domain/types";

export async function createConversation(project_id: string, title = "") {
  const db = await getDb();
  const id = newId("conv");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO conversation (id, project_id, title, summary, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, project_id, title, "", created_at]
  );
  return { id, project_id, title, summary: "", created_at } satisfies Conversation;
}

export async function listConversations(project_id: string) {
  const db = await getDb();
  return db.select<Conversation[]>(
    "SELECT * FROM conversation WHERE project_id = ? ORDER BY created_at ASC",
    [project_id]
  );
}
