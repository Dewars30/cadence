/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { OpenAILLMProvider } from "../../src/services/llm/providers/openai";
import { AnthropicLLMProvider } from "../../src/services/llm/providers/anthropic";
import { validateArtifactIRJson } from "../../src/domain/artifactIR";
import { validateOrRepairArtifactIR, MockArtifactIRRepairProvider } from "../../src/services/artifactIRService";
import type { RunContext } from "../../src/services/contextBuilder";
import { readEnv } from "../../src/services/env";

const context: RunContext = {
  project: { id: "proj_1", name: "Cadence", readme: "Test readme" },
  artifacts: [],
  conversations: [],
};

async function assertArtifactIR(outputJson: string) {
  const parsed = JSON.parse(outputJson);
  const validation = validateArtifactIRJson(parsed);
  expect(validation.valid).toBe(true);
  await validateOrRepairArtifactIR(outputJson, new MockArtifactIRRepairProvider());
}

describe("LLM provider ArtifactIR contract (optional)", () => {
  const runContracts = readEnv("RUN_LLM_CONTRACTS")?.toLowerCase() === "true";
  const anthropicKey = readEnv("ANTHROPIC_API_KEY");

  if (!runContracts) {
    it.skip("LLM contract tests are disabled (set RUN_LLM_CONTRACTS=true to run)", () => {});
    return;
  }
  // Canonical schema remains unchanged; OpenAI requires a schema adapter (next PR).
  it.skip(
    "OpenAI strict Structured Outputs rejects ArtifactIR schema (\"oneOf\" is not permitted). TODO: add OpenAI schema adapter.",
    async () => {
      const provider = new OpenAILLMProvider();
      const output = await provider.generate({
        phase: "Production",
        prompt: "Generate a short ArtifactIR report.",
        context,
        history: [],
      });
      await assertArtifactIR(output.output_json);
    },
  );

  if (!anthropicKey) {
    it.skip("Anthropic provider contract (set ANTHROPIC_API_KEY to run)", () => {});
  } else {
    it("Anthropic provider returns valid ArtifactIR", async () => {
      const provider = new AnthropicLLMProvider();
      try {
        const output = await provider.generate({
          phase: "Production",
          prompt: "Generate a short ArtifactIR report.",
          context,
          history: [],
        });
        await assertArtifactIR(output.output_json);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes("credit") || message.toLowerCase().includes("payment_required")) {
          console.warn(`[Cadence] Skipping Anthropic contract test due to billing: ${message}`);
          return;
        }
        throw err;
      }
    });
  }
});
