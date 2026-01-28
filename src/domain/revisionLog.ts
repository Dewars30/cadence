import type { IRTarget } from "./irPatch";

export type RevisionMode = "patch" | "full_regen_locked_outline" | "full_regen_allow_reflow";

export type RevisionProvider = "mock" | "openai" | "anthropic";

export type RevisionRecord = {
  revisionId: string;
  timestamp: string;
  mode: RevisionMode;
  target: IRTarget | "artifact";
  instruction: string;
  provider: RevisionProvider;
  model: string | null;
  patchCount: number;
  validation: "passed" | "repaired" | "failed";
  errors?: string[];
  irHashBefore: string;
  irHashAfter: string;
};

export type RevisionLog = {
  records: RevisionRecord[];
};
