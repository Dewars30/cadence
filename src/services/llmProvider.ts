// Back-compat facade: keep imports stable across the codebase.
// Existing code imports MockLLMProvider from here. Keep that working.

import type { RunContext } from "./contextBuilder";
import type { RunStep } from "../domain/types";

export type GenerateRequest = {
  phase: string;
  prompt: string;
  context: RunContext;
  history: RunStep[];
};

export type LLMResponse = {
  output_json: string;
};

export interface LLMProvider {
  generate(req: GenerateRequest): Promise<LLMResponse>;
}

// Re-export the mock provider from its new home.
export { MockLLMProvider } from "./llm/providers/mock";
