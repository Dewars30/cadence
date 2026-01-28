/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkspace } from "../../src/services/workspaceService";
import { createProject } from "../../src/services/projectService";
import { appendRevisionRecord, computeIRHash } from "../../src/services/revision/provenance";
import reportBasic from "../../fixtures/ir/report_basic.json";

const writtenBundles: Uint8Array[] = [];

vi.mock("jszip", () => {
  class JSZipMock {
    private files: Record<string, unknown> = {};
    file(name: string, data: unknown) {
      this.files[name] = data;
      return this;
    }
    async generateAsync() {
      const payload = JSON.stringify(this.files);
      return new TextEncoder().encode(payload);
    }
  }
  return { default: JSZipMock };
});

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(async () => "/tmp/provenance_bundle.zip"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(async () => new Uint8Array([9, 9, 9])),
  writeFile: vi.fn(async (_path: string, data: Uint8Array) => {
    writtenBundles.push(data);
  }),
}));

vi.mock("../../src/services/db", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/db")>(
    "../../src/services/db",
  );
  return {
    ...actual,
    getDbPath: async () => "/tmp/cadence.db",
  };
});

describe("exportProjectBundle provenance", () => {
  beforeEach(() => {
    writtenBundles.length = 0;
  });

  it("includes provenance.json in the zip bundle", async () => {
    const { exportProjectBundle } = await import("../../src/services/exportService");
    const workspace = await createWorkspace("Export WS");
    const project = await createProject(workspace.id, "Export Project");
    const hash = await computeIRHash(reportBasic);
    const timestamp = "2020-01-01T00:00:00.000Z";
    await appendRevisionRecord(project.id, {
      revisionId: "rev_export_1",
      timestamp,
      mode: "patch",
      target: { kind: "block", id: "block_003" },
      instruction: "Export test",
      provider: "mock",
      model: null,
      patchCount: 1,
      validation: "passed",
      irHashBefore: hash,
      irHashAfter: hash,
    });

    await exportProjectBundle({ projectId: project.id });
    await exportProjectBundle({ projectId: project.id });

    expect(writtenBundles.length).toBe(2);
    const decode = (bytes: Uint8Array) =>
      JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;

    const firstBundle = decode(writtenBundles[0]);
    const secondBundle = decode(writtenBundles[1]);

    const firstRaw = firstBundle["provenance.json"];
    const secondRaw = secondBundle["provenance.json"];

    expect(typeof firstRaw).toBe("string");
    expect(firstRaw).toBe(secondRaw);

    const firstParsed = JSON.parse(firstRaw as string);
    expect(firstParsed.schemaVersion).toBe(1);
    expect(firstParsed.createdAt).toBe(timestamp);
    expect(Array.isArray(firstParsed.records)).toBe(true);
    expect(firstParsed.records.length).toBe(1);
  });
});
