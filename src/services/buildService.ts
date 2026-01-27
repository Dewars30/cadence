import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Build } from "../domain/types";

export async function createBuild(params: {
  artifact_version_id: string;
  target: Build["target"];
  template_id?: string | null;
  file_name: string;
  file_path: string;
}) {
  const db = await getDb();
  const id = newId("build");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO build (id, artifact_version_id, target, template_id, file_name, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      params.artifact_version_id,
      params.target,
      params.template_id ?? null,
      params.file_name,
      params.file_path,
      created_at,
    ],
  );
  return {
    id,
    artifact_version_id: params.artifact_version_id,
    target: params.target,
    template_id: params.template_id ?? null,
    file_name: params.file_name,
    file_path: params.file_path,
    created_at,
  } satisfies Build;
}
