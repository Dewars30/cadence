import { ArtifactIR, validateArtifactIRJson } from "../domain/artifactIR";

export type ArtifactIRRepairRequest = {
  rawJson: string;
  errors: string[];
};

// Back-compat alias used by PR2 provider templates.
export type RepairRequest = ArtifactIRRepairRequest;

export interface ArtifactIRRepairProvider {
  repair(request: ArtifactIRRepairRequest): Promise<string>;
}

export class MockArtifactIRRepairProvider implements ArtifactIRRepairProvider {
  async repair(): Promise<string> {
    const fallback: ArtifactIR = {
      artifact: {
        id: "art_mock",
        type: "report",
        title: "Cadence Mock Artifact",
        template: "consulting_report_v1",
      },
      blocks: [
        { type: "titlePage", title: "Cadence Mock Artifact", subtitle: "Recovered Draft" },
        { type: "heading", level: 1, text: "Overview" },
        { type: "paragraph", text: "This artifact was repaired to match the schema." },
        { type: "bullets", items: ["Point one", "Point two", "Point three"] },
        {
          type: "table",
          columns: ["Item", "Value"],
          rows: [["Status", "Recovered"]],
        },
      ],
    };
    return JSON.stringify(fallback, null, 2);
  }
}

export async function validateOrRepairArtifactIR(
  rawJson: string,
  provider: ArtifactIRRepairProvider,
  maxAttempts = 2,
): Promise<{ ir: ArtifactIR; repaired: boolean }> {
  let attempts = 0;
  let current = rawJson;
  while (attempts <= maxAttempts) {
    try {
      const parsed = JSON.parse(current) as ArtifactIR;
      const validation = validateArtifactIRJson(parsed);
      if (validation.valid) {
        return { ir: parsed, repaired: attempts > 0 };
      }
      if (attempts === maxAttempts) {
        throw new Error(`ArtifactIR validation failed: ${validation.errors.join("; ")}`);
      }
      current = await provider.repair({ rawJson: current, errors: validation.errors });
    } catch (err) {
      if (attempts === maxAttempts) {
        throw err instanceof Error ? err : new Error("Failed to validate ArtifactIR.");
      }
      current = await provider.repair({
        rawJson: current,
        errors: ["Invalid JSON; repair to valid ArtifactIR."],
      });
    }
    attempts += 1;
  }
  throw new Error("ArtifactIR repair loop exceeded.");
}
