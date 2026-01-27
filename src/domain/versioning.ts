export type VersionStatus = "draft" | "checkpoint" | "final";
export type VersionLabel = "Draft" | "V1" | "V2" | "Final";

export function nextCheckpointLabel(existing: VersionLabel[]): VersionLabel {
  if (!existing.includes("V1")) return "V1";
  if (!existing.includes("V2")) return "V2";
  return "V2";
}

export function canCheckpoint(status: VersionStatus) {
  return status !== "final";
}

export function canLock(status: VersionStatus) {
  return status === "checkpoint";
}

export function lockLabel() {
  return "Final" as const;
}
