/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { compileArtifactToDocx } from "../../src/services/docxCompiler";
import reportBasic from "../../fixtures/ir/report_basic.json";
import reportTable from "../../fixtures/ir/report_table_heavy.json";

describe("DOCX compiler", () => {
  it("produces deterministic bytes for basic report", async () => {
    const result = await compileArtifactToDocx(reportBasic);
    expect(result.bytes.length).toBeGreaterThan(500);
    const hash = createHash("sha256").update(result.bytes).digest("hex");
    expect(hash).toMatchSnapshot();
  });

  it("produces deterministic bytes for table-heavy report", async () => {
    const result = await compileArtifactToDocx(reportTable);
    expect(result.bytes.length).toBeGreaterThan(500);
    const hash = createHash("sha256").update(result.bytes).digest("hex");
    expect(hash).toMatchSnapshot();
  });
});
