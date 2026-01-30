import { describe, it, expect } from "vitest";
import reportBasic from "../../fixtures/ir/report_basic.json";
import { applyPatches } from "../../src/services/patch/applyPatches";
import { reviseWithPatches } from "../../src/services/workflow/phases/reviseWithPatches";
import { MockArtifactIRRepairProvider } from "../../src/services/artifactIRService";
import type { LLMProvider, GenerateRequest } from "../../src/services/llmProvider";

const renamePatch = {
  op: "rename_heading" as const,
  target: { kind: "section" as const, id: "block_002" },
  newText: "Overview",
  expectedText: "Executive Summary",
};

describe("rename_heading patches", () => {
  it("updates heading text only", () => {
    const patches = [
      {
        op: "rename_heading",
        target: { kind: "section", id: "block_002" },
        newText: "  New Title  ",
      },
    ];
    const updated = applyPatches(reportBasic, patches);
    const heading = updated.blocks.find((block) => block.id === "block_002");
    expect(heading?.type).toBe("heading");
    expect(heading?.text).toBe("New Title");
    if (heading?.type === "heading") {
      expect(heading.level).toBe(1);
    }
  });

  it("fails when expectedText does not match", () => {
    const patches = [
      {
        ...renamePatch,
        expectedText: "Mismatch",
      },
    ];
    expect(() => applyPatches(reportBasic, patches)).toThrow(/expected text mismatch/i);
  });

  it("rejects rename_heading patches without token gate", async () => {
    const provider: LLMProvider = {
      async generate(_req: GenerateRequest) {
        void _req;
        return { output_json: JSON.stringify({ patches: [renamePatch] }) };
      },
    };

    await expect(
      reviseWithPatches({
        ir: reportBasic,
        instruction: "Rename heading.",
        target: { kind: "block", id: "block_003" },
        provider,
        repairProvider: new MockArtifactIRRepairProvider(),
        revisionMode: "patch",
        allowHeadingRenames: false,
      }),
    ).rejects.toThrow(/ALLOW_HEADING_RENAMES/);
  });

  it("allows rename_heading patches with token gate", async () => {
    const provider: LLMProvider = {
      async generate(_req: GenerateRequest) {
        void _req;
        return { output_json: JSON.stringify({ patches: [renamePatch] }) };
      },
    };

    const result = await reviseWithPatches({
      ir: reportBasic,
      instruction: "Rename heading.",
      target: { kind: "block", id: "block_003" },
      provider,
      repairProvider: new MockArtifactIRRepairProvider(),
      revisionMode: "patch",
      allowHeadingRenames: true,
    });

    const heading = result.ir.blocks.find((block) => block.id === "block_002");
    expect(heading?.type).toBe("heading");
    expect(heading?.text).toBe("Overview");
  });
});
