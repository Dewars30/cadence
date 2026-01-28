import { TOKEN_ALLOW_REFLOW, TOKEN_FULL_REGENERATE } from "./constants";
import type { RevisionMode } from "../../domain/revisionLog";

export type RegenTokenParseResult = {
  mode: RevisionMode;
  sanitizedInstruction: string;
  warnings: string[];
};

function stripTokens(instruction: string) {
  const stripped = instruction
    .replaceAll(TOKEN_FULL_REGENERATE, "")
    .replaceAll(TOKEN_ALLOW_REFLOW, "");
  return stripped.trim();
}

export function parseRegenTokens(instruction: string): RegenTokenParseResult {
  const hasFull = instruction.includes(TOKEN_FULL_REGENERATE);
  const hasAllow = instruction.includes(TOKEN_ALLOW_REFLOW);
  const warnings: string[] = [];

  let mode: RevisionMode = "patch";
  if (hasFull && hasAllow) {
    mode = "full_regen_allow_reflow";
  } else if (hasFull) {
    mode = "full_regen_locked_outline";
  } else if (hasAllow) {
    warnings.push("ALLOW_FULL_REFLOW token ignored without FULL_REGENERATE.");
  }

  return {
    mode,
    sanitizedInstruction: stripTokens(instruction),
    warnings,
  };
}
