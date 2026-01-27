import { getDb } from "./db";
import { nowIso, newId } from "./utils";
import type { ArtifactVersion } from "../domain/types";

export async function createVersion(
  artifact_id: string,
  content_json: string,
  version_label: ArtifactVersion["version_label"] = "Draft",
  status: ArtifactVersion["status"] = "draft"
) {
  const db = await getDb();
  const id = newId("ver");
  const created_at = nowIso();
  await db.execute(
    "INSERT INTO artifact_version (id, artifact_id, version_label, status, locked_at, content_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, artifact_id, version_label, status, null, content_json, created_at]
  );
  return {
    id,
    artifact_id,
    version_label,
    status,
    locked_at: null,
    content_json,
    created_at,
  } satisfies ArtifactVersion;
}

export async function listVersions(artifact_id: string) {
  const db = await getDb();
  return db.select<ArtifactVersion[]>(
    "SELECT * FROM artifact_version WHERE artifact_id = ? ORDER BY created_at ASC",
    [artifact_id]
  );
}

export async function getVersion(id: string) {
  const db = await getDb();
  const rows = await db.select<ArtifactVersion[]>(
    "SELECT * FROM artifact_version WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
}

export async function lockVersion(id: string) {
  const db = await getDb();
  const locked_at = nowIso();
  await db.execute(
    "UPDATE artifact_version SET status = 'final', version_label = 'Final', locked_at = ? WHERE id = ?",
    [locked_at, id]
  );
}
