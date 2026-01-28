/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkspace } from "../../src/services/workspaceService";
import { createProject } from "../../src/services/projectService";
import { appendRevisionRecord, computeIRHash } from "../../src/services/revision/provenance";
import reportBasic from "../../fixtures/ir/report_basic.json";

const zipFiles: Record<string, unknown> = {};

vi.mock("jszip", () => {
  class JSZipMock {
    file(name: string, data: unknown) {
      zipFiles[name] = data;
      return this;
    }
    async generateAsync() {
      return new Uint8Array([1, 2, 3]);
    }
  }
  return { default: JSZipMock };
});

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(async () => "/tmp/provenance_bundle.zip"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(async () => new Uint8Array([9, 9, 9])),
  writeFile: vi.fn(async () => undefined),
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
    Object.keys(zipFiles).forEach((key) => delete zipFiles[key]);
  });

  it("includes provenance.json in the zip bundle", async () => {
    const { exportProjectBundle } = await import("../../src/services/exportService");
    const workspace = await createWorkspace("Export WS");
    const project = await createProject(workspace.id, "Export Project");
    const hash = await computeIRHash(reportBasic);
    await appendRevisionRecord(project.id, {
      revisionId: "rev_export_1",
      timestamp: new Date().toISOString(),
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
    expect(Object.keys(zipFiles)).toContain("provenance.json");
    const raw = zipFiles["provenance.json"];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(String(raw));
    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.createdAt).toBe("string");
    expect(Array.isArray(parsed.records)).toBe(true);
    expect(parsed.records.length).toBe(1);
  });
});
