/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import reportBasic from "../../fixtures/ir/report_basic.json";
import { computeIRHash, appendRevisionRecord, getRevisionLog } from "../../src/services/revision/provenance";
import { createWorkspace } from "../../src/services/workspaceService";
import { createProject } from "../../src/services/projectService";
import type { RevisionRecord } from "../../src/domain/revisionLog";

describe("provenance helpers", () => {
  it("computes deterministic hashes for identical IR", async () => {
    const hash1 = await computeIRHash(reportBasic);
    const hash2 = await computeIRHash(reportBasic);
    expect(hash1).toBe(hash2);
  });

  it("appends revision records to project ai_context_json", async () => {
    const workspace = await createWorkspace("Provenance WS");
    const project = await createProject(workspace.id, "Provenance Project");
    const baseHash = await computeIRHash(reportBasic);

    const record: RevisionRecord = {
      revisionId: "rev_test_1",
      timestamp: new Date().toISOString(),
      mode: "patch",
      target: { kind: "block", id: "block_003" },
      instruction: "Test",
      provider: "mock",
      model: null,
      patchCount: 1,
      validation: "passed",
      irHashBefore: baseHash,
      irHashAfter: baseHash,
    };

    await appendRevisionRecord(project.id, record);
    const log = await getRevisionLog(project.id);
    expect(log.records.length).toBe(1);
    expect(log.records[0].revisionId).toBe("rev_test_1");
  });

  it("caps provenance records at 200 and drops oldest first", async () => {
    const workspace = await createWorkspace("Cap WS");
    const project = await createProject(workspace.id, "Cap Project");
    const baseHash = await computeIRHash(reportBasic);

    for (let i = 1; i <= 205; i += 1) {
      await appendRevisionRecord(project.id, {
        revisionId: `rev_${String(i).padStart(3, "0")}`,
        timestamp: new Date().toISOString(),
        mode: "patch",
        target: { kind: "block", id: "block_003" },
        instruction: "Cap test",
        provider: "mock",
        model: null,
        patchCount: 1,
        validation: "passed",
        irHashBefore: baseHash,
        irHashAfter: baseHash,
      });
    }

    const log = await getRevisionLog(project.id);
    expect(log.records.length).toBe(200);
    expect(log.records[0].revisionId).toBe("rev_006");
  });
});
