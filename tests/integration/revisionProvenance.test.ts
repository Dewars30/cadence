/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import reportBasic from "../../fixtures/ir/report_basic.json";
import { MockLLMProvider } from "../../src/services/llmProvider";
import { MockArtifactIRRepairProvider } from "../../src/services/artifactIRService";
import { reviseArtifactWithPatches } from "../../src/services/runWorkflow";
import { createWorkspace } from "../../src/services/workspaceService";
import { createProject } from "../../src/services/projectService";
import { getRevisionLog } from "../../src/services/revision/provenance";

describe("revision provenance integration", () => {
  it("appends a record for patch revisions and truncates instruction", async () => {
    const workspace = await createWorkspace("Prov WS");
    const project = await createProject(workspace.id, "Prov Project");
    const provider = new MockLLMProvider();
    const repairProvider = new MockArtifactIRRepairProvider();
    const longInstruction = "A".repeat(600);

    await reviseArtifactWithPatches({
      projectId: project.id,
      ir: reportBasic,
      instruction: longInstruction,
      target: { kind: "block", id: "block_003" },
      provider,
      repairProvider,
      providerName: "mock",
    });

    const log = await getRevisionLog(project.id);
    expect(log.records.length).toBe(1);
    expect(log.records[0].mode).toBe("patch");
    expect(log.records[0].patchCount).toBe(1);
    expect(log.records[0].instruction.length).toBeLessThanOrEqual(500);
  });
});
