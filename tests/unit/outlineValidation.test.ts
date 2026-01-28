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

describe("validateOutlineInvariants", () => {
  it("passes when only body content changes", () => {
    const modified: ArtifactIR = {
      ...baseIr,
      blocks: baseIr.blocks.map((block) =>
        block.id === "block_003" ? { ...block, text: "Updated body" } : block,
      ),
    };
    const result = validateOutlineInvariants(baseIr, modified);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("fails when heading id changes", () => {
    const modified: ArtifactIR = {
      ...baseIr,
      blocks: baseIr.blocks.map((block) =>
        block.id === "block_002" ? { ...block, id: "block_999" } : block,
      ),
    };
    const result = validateOutlineInvariants(baseIr, modified);
    expect(result.valid).toBe(false);
  });

  it("fails when heading order changes", () => {
    const modified: ArtifactIR = {
      ...baseIr,
      blocks: [
        baseIr.blocks[0],
        baseIr.blocks[3],
        baseIr.blocks[4],
        baseIr.blocks[1],
        baseIr.blocks[2],
      ],
    };
    const result = validateOutlineInvariants(baseIr, modified);
    expect(result.valid).toBe(false);
  });

  it("fails when heading level changes", () => {
    const modified: ArtifactIR = {
      ...baseIr,
      blocks: baseIr.blocks.map((block) =>
        block.id === "block_004" ? { ...block, level: 2 } : block,
      ),
    };
    const result = validateOutlineInvariants(baseIr, modified);
    expect(result.valid).toBe(false);
  });
});
