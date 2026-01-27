import type { LLMProvider } from "../llmProvider";
import type { ArtifactIRRepairProvider } from "../artifactIRService";
import { readEnvWithDefault } from "../env";

import { MockLLMProvider } from "./providers/mock";
import { OpenAILLMProvider } from "./providers/openai";
import { AnthropicLLMProvider } from "./providers/anthropic";

import { MockArtifactIRRepairProvider } from "./repair/mockArtifactIRRepairProvider";
import { OpenAIArtifactIRRepairProvider } from "./repair/openaiArtifactIRRepairProvider";
import { AnthropicArtifactIRRepairProvider } from "./repair/anthropicArtifactIRRepairProvider";

export type LLMProviderName = "mock" | "openai" | "anthropic";

export type ProviderBundle = {
  llm: LLMProvider;
  repair: ArtifactIRRepairProvider;
  name: LLMProviderName;
};

export function getProviderNameFromEnv(): LLMProviderName {
  const raw = readEnvWithDefault("CADENCE_LLM_PROVIDER", "mock").toLowerCase();
  if (raw === "openai" || raw === "anthropic" || raw === "mock") return raw;
  return "mock";
}

export function createProviderBundle(): ProviderBundle {
  const name = getProviderNameFromEnv();

  switch (name) {
    case "openai":
      return {
        name,
        llm: new OpenAILLMProvider(),
        repair: new OpenAIArtifactIRRepairProvider(),
      };
    case "anthropic":
      return {
        name,
        llm: new AnthropicLLMProvider(),
        repair: new AnthropicArtifactIRRepairProvider(),
      };
    case "mock":
    default:
      return {
        name: "mock",
        llm: new MockLLMProvider(),
        repair: new MockArtifactIRRepairProvider(),
      };
  }
}
