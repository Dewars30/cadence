/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import reportBasic from "../../fixtures/ir/report_basic.json";
import { MockLLMProvider } from "../../src/services/llmProvider";
import { MockArtifactIRRepairProvider, validateOrRepairArtifactIR } from "../../src/services/artifactIRService";
import { reviseWithPatches } from "../../src/services/workflow/phases/reviseWithPatches";
import { compileArtifactToDocx } from "../../src/services/docxCompiler";

describe("Revision workflow", () => {
  it("applies mock patches and compiles deterministic DOCX", async () => {
    const provider = new MockLLMProvider();
    const { ir } = await reviseWithPatches({
      ir: reportBasic,
      instruction: "Revise the executive summary to be more assertive.",
      target: { kind: "block", id: "block_003" },
      provider,
      repairProvider: new MockArtifactIRRepairProvider(),
      revisionMode: "patch",
    });

    const validated = await validateOrRepairArtifactIR(JSON.stringify(ir), new MockArtifactIRRepairProvider());
    expect(validated.ir.blocks[2].type).toBe("paragraph");
    expect(validated.ir.blocks[2].text).toBe("Revised via patch fixture.");

    const docx = await compileArtifactToDocx(validated.ir);
    const hash = createHash("sha256").update(docx.bytes).digest("hex");
    expect(hash).toMatchSnapshot();
  });
});
