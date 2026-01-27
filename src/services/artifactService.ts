import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { Artifact } from "../domain/types";

export async function createArtifact(
  project_id: string,
  artifact_type: Artifact["artifact_type"],
  title: string
) {
  const db = await getDb();
  const id = newId("art");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO artifact (id, project_id, artifact_type, title, current_version_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, project_id, artifact_type, title, null, created_at]
  );
  return {
    id,
    project_id,
    artifact_type,
    title,
    current_version_id: null,
    created_at,
  } satisfies Artifact;
}

export async function listArtifacts(project_id: string) {
  const db = await getDb();
  return db.select<Artifact[]>(
    "SELECT * FROM artifact WHERE project_id = ? ORDER BY created_at ASC",
    [project_id]
  );
}

export async function getArtifact(id: string) {
  const db = await getDb();
  const rows = await db.select<Artifact[]>("SELECT * FROM artifact WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function setCurrentVersion(artifact_id: string, version_id: string | null) {
  const db = await getDb();
  await db.execute("UPDATE artifact SET current_version_id = ? WHERE id = ?", [
    version_id,
    artifact_id,
  ]);
}
