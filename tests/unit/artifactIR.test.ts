import { describe, it, expect } from "vitest";
import { validateArtifactIRJson } from "../../src/domain/artifactIR";
import reportBasic from "../../fixtures/ir/report_basic.json";
import reportTable from "../../fixtures/ir/report_table_heavy.json";

describe("ArtifactIR schema validation", () => {
  it("accepts valid fixtures", () => {
    const basic = validateArtifactIRJson(reportBasic);
    const table = validateArtifactIRJson(reportTable);
    expect(basic.valid).toBe(true);
    expect(table.valid).toBe(true);
  });

  it("rejects invalid payloads", () => {
    const invalid = validateArtifactIRJson({ artifact: { id: "x" } });
    expect(invalid.valid).toBe(false);
  });
});
