import { describe, it, expect } from "vitest";
import { validateOutlineInvariants } from "../../src/services/revision/outlineValidation";
import type { ArtifactIR } from "../../src/domain/artifactIR";

const baseIr: ArtifactIR = {
  artifact: { id: "art_test", type: "report", title: "Outline", template: "default" },
  blocks: [
    { id: "block_001", type: "titlePage", title: "Outline", subtitle: "v1" },
    { id: "block_002", type: "heading", level: 1, text: "Section A" },
    { id: "block_003", type: "paragraph", text: "Body A" },
    { id: "block_004", type: "heading", level: 1, text: "Section B" },
    { id: "block_005", type: "paragraph", text: "Body B" },
  ],
};

describe("outline validation with approved renames", () => {
  it("allows heading text change when approved", () => {
    const renamed: ArtifactIR = {
      ...baseIr,
      blocks: baseIr.blocks.map((block) =>
        block.id === "block_002" ? { ...block, text: "Section Alpha" } : block,
      ),
    };
    const allowedRenames = new Map([["block_002", { from: "Section A", to: "Section Alpha" }]]);
    const result = validateOutlineInvariants(baseIr, renamed, { allowedRenames });
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("rejects heading text change when approval does not match", () => {
    const renamed: ArtifactIR = {
      ...baseIr,
      blocks: baseIr.blocks.map((block) =>
        block.id === "block_002" ? { ...block, text: "Section Gamma" } : block,
      ),
    };
    const allowedRenames = new Map([["block_002", { from: "Section A", to: "Section Alpha" }]]);
    const result = validateOutlineInvariants(baseIr, renamed, { allowedRenames });
    expect(result.valid).toBe(false);
  });
});
