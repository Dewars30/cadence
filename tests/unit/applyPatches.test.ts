import { describe, it, expect } from "vitest";
import reportBasic from "../../fixtures/ir/report_basic.json";
import reportLong from "../../fixtures/ir/report_long_toc.json";
import reportTable from "../../fixtures/ir/report_table_heavy.json";
import { applyPatches } from "../../src/services/patch/applyPatches";

describe("applyPatches", () => {
  it("replaces a block's content only", () => {
    const patches = [
      {
        op: "replace",
        target: { kind: "block", id: "block_003" },
        value: { id: "block_003", type: "paragraph", text: "Revised content." },
      },
    ];
    const updated = applyPatches(reportBasic, patches);
    expect(updated.blocks[2].type).toBe("paragraph");
    expect(updated.blocks[2].text).toBe("Revised content.");
    expect(updated.blocks[0].id).toBe("block_001");
    expect(updated.blocks[1].id).toBe("block_002");
    expect(updated.blocks[3].id).toBe("block_004");
  });

  it("inserts blocks after a section without altering sibling content", () => {
    const patches = [
      {
        op: "insert_after",
        target: { kind: "section", id: "block_006" },
        values: [{ type: "bullets", items: ["Added bullet A", "Added bullet B"] }],
      },
    ];
    const updated = applyPatches(reportLong, patches);
    const inserted = updated.blocks.find((block) => block.type === "bullets");
    expect(inserted).toBeTruthy();
    expect(updated.blocks[5].id).toBe("block_006");
    expect(updated.blocks[6].id).toBe("block_007");
    const nextHeading = updated.blocks.find((block) => block.id === "block_008");
    expect(nextHeading?.type).toBe("heading");
  });

  it("deletes a block and keeps schema valid", () => {
    const patches = [
      {
        op: "delete",
        target: { kind: "block", id: "block_003" },
      },
    ];
    const updated = applyPatches(reportTable, patches);
    expect(updated.blocks.find((block) => block.id === "block_003")).toBeUndefined();
    expect(updated.blocks.length).toBe(2);
  });

  it("applies patches deterministically", () => {
    const patches = [
      {
        op: "replace",
        target: { kind: "block", id: "block_003" },
        value: { id: "block_003", type: "paragraph", text: "Deterministic." },
      },
    ];
    const first = applyPatches(reportBasic, patches);
    const second = applyPatches(reportBasic, patches);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("fails closed when target id is missing", () => {
    const patches = [
      {
        op: "delete",
        target: { kind: "block", id: "missing_block" },
      },
    ];
    expect(() => applyPatches(reportBasic, patches)).toThrow(/not found/);
  });

  it("fails closed when deleting a required structural block", () => {
    const patches = [
      {
        op: "delete",
        target: { kind: "block", id: "block_001" },
      },
    ];
    expect(() => applyPatches(reportBasic, patches)).toThrow(/titlePage/);
  });
});
