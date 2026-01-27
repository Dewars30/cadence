type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsOneOf(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsOneOf);
  }
  if (isRecord(value)) {
    if ("oneOf" in value) return true;
    return Object.values(value).some(containsOneOf);
  }
  return false;
}

export function assertOpenAIStrictSchemaCompatible(schema: unknown) {
  if (containsOneOf(schema)) {
    throw new Error(
      "OpenAI strict Structured Outputs rejects schemas containing oneOf. " +
        "Canonical ArtifactIR schema includes oneOf; use an OpenAI schema adapter.",
    );
  }
}
