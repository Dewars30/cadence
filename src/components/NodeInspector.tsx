import { useEffect, useMemo, useState } from "react";
import { useCadenceStore } from "../state/useCadenceStore";
import { listVersions, createVersion, lockVersion } from "../services/versionService";
import { setCurrentVersion } from "../services/artifactService";
import { exportArtifactVersionToDocx } from "../services/exportService";
import { validateOrRepairArtifactIR } from "../services/artifactIRService";
import { getProviderBundle } from "../services/llm/registry";

export function NodeInspector() {
  const nodes = useCadenceStore((s) => s.nodes);
  const selectedNodeId = useCadenceStore((s) => s.selectedNodeId);
  const removeNode = useCadenceStore((s) => s.removeNode);
  const currentRun = useCadenceStore((s) => s.currentRun);
  const runSteps = useCadenceStore((s) => s.runSteps);
  const runError = useCadenceStore((s) => s.runError);
  const startRun = useCadenceStore((s) => s.startRun);
  const advanceRun = useCadenceStore((s) => s.advanceRun);
  const pauseRun = useCadenceStore((s) => s.pauseRun);
  const [prompt, setPrompt] = useState("Generate the Cadence MVP report.");
  const [versions, setVersions] = useState<Array<{ id: string; label: string; status: string }>>([]);
  const nextLabel = versions.length === 0 ? "V1" : "V2";

  const node = useMemo(
    () => nodes.find((item) => item.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  useEffect(() => {
    if (!node || node.node_type !== "artifact" || !node.ref_id) {
      setVersions([]);
      return;
    }
    listVersions(node.ref_id).then((items) =>
      setVersions(items.map((item) => ({ id: item.id, label: item.version_label, status: item.status }))),
    );
  }, [node]);

  if (!node) {
    return (
      <div className="cadence-panel">
        <h2>Inspector</h2>
        <p>Select a node to view metadata.</p>
      </div>
    );
  }

  return (
    <div className="cadence-panel">
      <h2>Inspector</h2>
      <div className="cadence-panel__section">
        <h3>Metadata</h3>
        <div className="cadence-meta">
          <div>
            <span>Type</span>
            <strong>{node.node_type}</strong>
          </div>
          <div>
            <span>Node ID</span>
            <strong>{node.id}</strong>
          </div>
          <div>
            <span>Ref</span>
            <strong>{node.ref_id ?? "—"}</strong>
          </div>
          <div>
            <span>Position</span>
            <strong>
              {Math.round(node.x)}, {Math.round(node.y)}
            </strong>
          </div>
          <div>
            <span>Size</span>
            <strong>
              {Math.round(node.w)} × {Math.round(node.h)}
            </strong>
          </div>
        </div>
      </div>
      <div className="cadence-panel__section">
        <h3>Version timeline</h3>
        {versions.length === 0 ? (
          <p className="cadence-muted">No versions yet.</p>
        ) : (
          <ul className="cadence-versions">
            {versions.map((version) => (
              <li key={version.id}>
                <strong>{version.label}</strong>
                <span>{version.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {node.node_type === "artifact" && (
        <div className="cadence-panel__section">
          <h3>Run</h3>
          <textarea
            className="cadence-textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          {runError && <p className="cadence-error">{runError}</p>}
          <div className="cadence-panel__actions">
            <button onClick={() => startRun(prompt)}>Start Run</button>
            <button onClick={() => advanceRun(prompt)}>Approve Phase</button>
            <button onClick={() => pauseRun()}>Pause</button>
          </div>
          {currentRun && (
            <div className="cadence-run">
              <div>
                <span>Phase</span>
                <strong>{currentRun.phase}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{currentRun.status}</strong>
              </div>
              <div>
                <span>Output</span>
                <pre>{runSteps[runSteps.length - 1]?.output_json ?? "—"}</pre>
              </div>
            </div>
          )}
        </div>
      )}
      {node.node_type === "artifact" && node.ref_id && (
        <div className="cadence-panel__section">
          <h3>Export</h3>
          <div className="cadence-panel__actions">
            <button
              onClick={async () => {
                const latest = runSteps[runSteps.length - 1]?.output_json ?? "{}";
                const repairProvider = getProviderBundle().repair;
                const { ir } = await validateOrRepairArtifactIR(latest, repairProvider);
                const version = await createVersion(node.ref_id!, JSON.stringify(ir), nextLabel, "checkpoint");
                await setCurrentVersion(node.ref_id!, version.id);
                setVersions((prev) => [...prev, { id: version.id, label: version.version_label, status: version.status }]);
              }}
            >
              Checkpoint {nextLabel}
            </button>
            {versions.length > 0 && (
              <>
                <button onClick={() => exportArtifactVersionToDocx({ artifactVersionId: versions[versions.length - 1].id })}>
                  Export DOCX
                </button>
                <button onClick={() => lockVersion(versions[versions.length - 1].id)}>Lock Final</button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="cadence-panel__actions">
        <button className="danger" onClick={() => removeNode(node.id)}>
          Delete node
        </button>
      </div>
    </div>
  );
}
