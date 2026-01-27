/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { MockLLMProvider } from "../../src/services/llmProvider";
import { compileArtifactToDocx } from "../../src/services/docxCompiler";
import { validateOrRepairArtifactIR, MockArtifactIRRepairProvider } from "../../src/services/artifactIRService";
import type { RunContext } from "../../src/services/contextBuilder";

describe("Run -> compile integration", () => {
  it("generates production IR and compiles DOCX bytes", async () => {
    const provider = new MockLLMProvider();
    const context: RunContext = {
      project: { id: "proj_1", name: "Cadence", readme: "Test readme" },
      artifacts: [],
      conversations: [],
    };
    const output = await provider.generate({
      phase: "Production",
      prompt: "Generate report",
      context,
      history: [],
    });

    const { ir } = await validateOrRepairArtifactIR(output.output_json, new MockArtifactIRRepairProvider());
    const docx = await compileArtifactToDocx(ir);
    expect(docx.bytes.length).toBeGreaterThan(500);
  });
});
