/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import type { ArtifactIR, ArtifactBlock } from "../../src/domain/artifactIR";
import type { LLMProvider, GenerateRequest } from "../../src/services/llmProvider";
import { MockArtifactIRRepairProvider } from "../../src/services/artifactIRService";
import { reviseWithPatches } from "../../src/services/workflow/phases/reviseWithPatches";
import reportBasic from "../../fixtures/ir/report_basic.json";

function renameHeading(ir: ArtifactIR, id: string, text: string): ArtifactIR {
  return {
    ...ir,
    blocks: ir.blocks.map((block) => {
      if (block.id === id && block.type === "heading") {
        return { ...(block as ArtifactBlock & { type: "heading" }), text };
      }
      return block;
    }),
  };
}

class RenameProvider implements LLMProvider {
  private renamedIr: ArtifactIR;

  constructor(renamedIr: ArtifactIR) {
    this.renamedIr = renamedIr;
  }

  async generate(req: GenerateRequest) {
    if (req.phase === "Revision") {
      return {
        output_json: JSON.stringify({
          patches: [
            {
              op: "rename_heading",
              target: { kind: "section", id: "block_002" },
              newText: "Overview",
              expectedText: "Executive Summary",
            },
          ],
        }),
      };
    }
    if (req.phase === "Production") {
      return { output_json: JSON.stringify(this.renamedIr) };
    }
    return { output_json: JSON.stringify({}) };
  }
}

describe("locked regen with heading renames", () => {
  it("allows approved heading renames in locked-outline regen", async () => {
    const renamedIr = renameHeading(reportBasic, "block_002", "Overview");
    const provider = new RenameProvider(renamedIr);
    const result = await reviseWithPatches({
      ir: reportBasic,
      instruction: "Make headings punchier.",
      target: { kind: "block", id: "block_003" },
      provider,
      repairProvider: new MockArtifactIRRepairProvider(),
      revisionMode: "full_regen_locked_outline",
      allowHeadingRenames: true,
    });

    const heading = result.ir.blocks.find((block) => block.id === "block_002");
    expect(heading?.type).toBe("heading");
    expect(heading?.type === "heading" ? heading.text : null).toBe("Overview");
    expect(result.headingRenames).toEqual([
      { id: "block_002", from: "Executive Summary", to: "Overview" },
    ]);
  });

  it("fails locked-outline regen when renames are attempted without approval", async () => {
    const renamedIr = renameHeading(reportBasic, "block_002", "Overview");
    const provider = new RenameProvider(renamedIr);
    await expect(
      reviseWithPatches({
        ir: reportBasic,
        instruction: "Make headings punchier.",
        target: { kind: "block", id: "block_003" },
        provider,
        repairProvider: new MockArtifactIRRepairProvider(),
        revisionMode: "full_regen_locked_outline",
        allowHeadingRenames: false,
      }),
    ).rejects.toThrow(/Locked-outline regeneration violated invariants/);
  });
});
