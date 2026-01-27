import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Message } from "../domain/types";

export async function addMessage(
  conversation_id: string,
  role: Message["role"],
  content: string
) {
  const db = await getDb();
  const id = newId("msg");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO message (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, conversation_id, role, content, created_at]
  );
  return { id, conversation_id, role, content, created_at } satisfies Message;
}

export async function listMessages(conversation_id: string) {
  const db = await getDb();
  return db.select<Message[]>(
    "SELECT * FROM message WHERE conversation_id = ? ORDER BY created_at ASC",
    [conversation_id]
  );
}
