import type { LLMProvider } from "../llmProvider";
import type { ArtifactIRRepairProvider } from "../artifactIRService";
import { readEnv } from "../env";

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
const isBrowser = typeof window !== "undefined";
const isTauri = isBrowser && (window as { __TAURI__?: unknown }).__TAURI__ != null;
let warnedBrowserProvider = false;
let warnedInvalidProvider = false;

export function getProviderNameFromEnv(): LLMProviderName {
  const rawEnv = readEnv("CADENCE_LLM_PROVIDER");
  const raw = (rawEnv ?? "mock").toLowerCase();

  if (isBrowser && !isTauri) {
    if (rawEnv && raw !== "mock" && !warnedBrowserProvider) {
      warnedBrowserProvider = true;
      console.warn(
        `[Cadence] CADENCE_LLM_PROVIDER="${rawEnv}" ignored in browser builds. ` +
          "OpenAI/Anthropic keys must not run in the browser. Falling back to \"mock\".",
      );
    }
    return "mock";
  }

  if (raw === "openai" || raw === "anthropic" || raw === "mock") return raw;

  if (rawEnv && !warnedInvalidProvider) {
    warnedInvalidProvider = true;
    console.warn(
      `[Cadence] Invalid CADENCE_LLM_PROVIDER="${rawEnv}". Expected mock|openai|anthropic. ` +
        "Falling back to \"mock\".",
    );
  }
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

let cachedBundle: ProviderBundle | null = null;

export function getProviderBundle(): ProviderBundle {
  if (!cachedBundle) cachedBundle = createProviderBundle();
  return cachedBundle;
}
