import { describe, it, expect } from "vitest";
import { parseRegenTokens } from "../../src/services/revision/regenTokens";
import {
  TOKEN_ALLOW_HEADING_RENAMES,
  TOKEN_ALLOW_REFLOW,
  TOKEN_FULL_REGENERATE,
} from "../../src/services/revision/constants";

describe("regen token parsing", () => {
  it("defaults to patch mode with no tokens", () => {
    const result = parseRegenTokens("Revise the executive summary.");
    expect(result.mode).toBe("patch");
    expect(result.warnings).toEqual([]);
    expect(result.sanitizedInstruction).toBe("Revise the executive summary.");
  });

  it("parses FULL_REGENERATE as locked-outline regen", () => {
    const result = parseRegenTokens(`Redo it ${TOKEN_FULL_REGENERATE}`);
    expect(result.mode).toBe("full_regen_locked_outline");
    expect(result.warnings).toEqual([]);
    expect(result.sanitizedInstruction).toBe("Redo it");
  });

  it("parses FULL_REGENERATE + ALLOW_FULL_REFLOW as allow-reflow regen", () => {
    const result = parseRegenTokens(`Redo ${TOKEN_FULL_REGENERATE} then ${TOKEN_ALLOW_REFLOW}`);
    expect(result.mode).toBe("full_regen_allow_reflow");
    expect(result.warnings).toEqual([]);
    expect(result.sanitizedInstruction.includes(TOKEN_FULL_REGENERATE)).toBe(false);
    expect(result.sanitizedInstruction.includes(TOKEN_ALLOW_REFLOW)).toBe(false);
  });

  it("warns and stays in patch mode when ALLOW_FULL_REFLOW appears alone", () => {
    const result = parseRegenTokens(`Please redo ${TOKEN_ALLOW_REFLOW}`);
    expect(result.mode).toBe("patch");
    expect(result.warnings.length).toBe(1);
  });

  it("is case-sensitive", () => {
    const result = parseRegenTokens("Please redo [[full_regenerate]]");
    expect(result.mode).toBe("patch");
    expect(result.warnings).toEqual([]);
  });

  it("parses ALLOW_HEADING_RENAMES and strips the token", () => {
    const result = parseRegenTokens(`Rename this ${TOKEN_ALLOW_HEADING_RENAMES}`);
    expect(result.allowHeadingRenames).toBe(true);
    expect(result.sanitizedInstruction).toBe("Rename this");
  });
});
