import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { StyleTemplate } from "../domain/types";

export async function createTemplate(
  name: string,
  config_json: string,
  project_id: string | null = null
) {
  const db = await getDb();
  const id = newId("tpl");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO style_template (id, project_id, name, config_json, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, project_id, name, config_json, created_at]
  );
  return { id, project_id, name, config_json, created_at } satisfies StyleTemplate;
}

export async function listTemplates(project_id: string | null = null) {
  const db = await getDb();
  if (project_id) {
    return db.select<StyleTemplate[]>(
      "SELECT * FROM style_template WHERE project_id = ? ORDER BY created_at ASC",
      [project_id]
    );
  }
  return db.select<StyleTemplate[]>(
    "SELECT * FROM style_template WHERE project_id IS NULL ORDER BY created_at ASC"
  );
}
