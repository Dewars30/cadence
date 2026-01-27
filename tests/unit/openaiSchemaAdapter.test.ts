import { describe, it, expect } from "vitest";
import artifactSchema from "../../src/domain/artifactIR.schema.json";
import { assertOpenAIStrictSchemaCompatible } from "../../src/services/llm/providers/openaiSchema";

describe("OpenAI strict schema compatibility", () => {
  it("canonical ArtifactIR schema is not OpenAI-strict compatible (oneOf)", () => {
    expect(() => assertOpenAIStrictSchemaCompatible(artifactSchema)).toThrow(/oneOf/i);
  });
});
