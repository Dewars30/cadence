import { create } from "zustand";
import { initDb } from "../services/db";
import { createWorkspace, listWorkspaces } from "../services/workspaceService";
import { createProject, listProjects } from "../services/projectService";
import {
  createCanvasNode,
  deleteCanvasNode,
  listCanvasNodes,
  updateCanvasNodePosition,
} from "../services/canvasService";
import type { CanvasNode, Project, Workspace, Run, RunStep } from "../domain/types";
import { createConversation } from "../services/conversationService";
import { createArtifact } from "../services/artifactService";
import { MockLLMProvider } from "../services/llmProvider";
import { advanceRun, pauseRun, startRun } from "../services/runWorkflow";
import { listRunSteps } from "../services/runService";

type CadenceState = {
  initialized: boolean;
  initializing: boolean;
  workspace: Workspace | null;
  project: Project | null;
  nodes: CanvasNode[];
  selectedNodeId: string | null;
  error: string | null;
  currentRun: Run | null;
  runSteps: RunStep[];
  runError: string | null;
  init: () => Promise<void>;
  addNode: (type: CanvasNode["node_type"]) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
  selectNode: (id: string | null) => void;
  refreshNodes: () => Promise<void>;
  updateNodeFrame: (id: string, frame: { x: number; y: number; w: number; h: number }) => Promise<void>;
  startRun: (prompt: string) => Promise<void>;
  advanceRun: (prompt: string) => Promise<void>;
  pauseRun: () => Promise<void>;
};

async function ensureWorkspaceAndProject(): Promise<{
  workspace: Workspace;
  project: Project;
}> {
  const workspaces = await listWorkspaces();
  let workspace = workspaces[0];
  if (!workspace) {
    workspace = await createWorkspace("Primary Workspace");
  }

  const projects = await listProjects(workspace.id);
  let project = projects[0];
  if (!project) {
    project = await createProject(workspace.id, "Cadence MVP Project");
  }

  return { workspace, project };
}

export const useCadenceStore = create<CadenceState>((set, get) => ({
  initialized: false,
  initializing: false,
  workspace: null,
  project: null,
  nodes: [],
  selectedNodeId: null,
  error: null,
  currentRun: null,
  runSteps: [],
  runError: null,
  init: async () => {
    if (get().initialized || get().initializing) return;
    set({ initializing: true, error: null });
    try {
      await initDb();
      const { workspace, project } = await ensureWorkspaceAndProject();
      const nodes = await listCanvasNodes(project.id);
      set({
        initialized: true,
        initializing: false,
        workspace,
        project,
        nodes,
        selectedNodeId: nodes[0]?.id ?? null,
      });
    } catch (err) {
      set({
        initializing: false,
        error: err instanceof Error ? err.message : "Failed to initialize Cadence",
      });
    }
  },
  refreshNodes: async () => {
    const project = get().project;
    if (!project) return;
    const nodes = await listCanvasNodes(project.id);
    set({ nodes });
  },
  addNode: async (type: CanvasNode["node_type"]) => {
    const project = get().project;
    if (!project) return;
    const baseOffset = get().nodes.length * 40;
    let refId: string | null = null;
    if (type === "chat") {
      const conversation = await createConversation(project.id, `Chat ${get().nodes.length + 1}`);
      refId = conversation.id;
    } else if (type === "artifact") {
      const artifact = await createArtifact(project.id, "report", `Artifact ${get().nodes.length + 1}`);
      refId = artifact.id;
    }
    const node = await createCanvasNode(
      project.id,
      type,
      120 + baseOffset,
      120 + baseOffset,
      400,
      280,
      refId,
    );
    set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: node.id }));
  },
  removeNode: async (id: string) => {
    await deleteCanvasNode(id);
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },
  selectNode: (id) => set({ selectedNodeId: id }),
  updateNodeFrame: async (id, frame) => {
    await updateCanvasNodePosition(id, frame.x, frame.y, frame.w, frame.h);
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, x: frame.x, y: frame.y, w: frame.w, h: frame.h } : node,
      ),
    }));
  },
  startRun: async (prompt: string) => {
    const project = get().project;
    const selectedNodeId = get().selectedNodeId;
    if (!project) return;
    const selectedNode = get().nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode || selectedNode.node_type !== "artifact") {
      set({ runError: "Select an Artifact node to start a run." });
      return;
    }
    const provider = new MockLLMProvider();
    const run = await startRun({
      projectId: project.id,
      prompt,
      artifactId: selectedNode.ref_id,
      provider,
    });
    const steps = await listRunSteps(run.id);
    set({ currentRun: run, runSteps: steps, runError: null });
  },
  advanceRun: async (prompt: string) => {
    const run = get().currentRun;
    if (!run) return;
    const provider = new MockLLMProvider();
    const updated = await advanceRun({ runId: run.id, prompt, provider });
    const steps = await listRunSteps(run.id);
    set({ currentRun: updated, runSteps: steps });
  },
  pauseRun: async () => {
    const run = get().currentRun;
    if (!run) return;
    const updated = await pauseRun(run.id);
    set({ currentRun: updated });
  },
}));
