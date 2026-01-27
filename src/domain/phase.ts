export const WORKFLOW_PHASES = [
  "Understanding",
  "Requirements",
  "Scaffolding",
  "Production",
  "Finalization",
] as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];

export function nextPhase(current: WorkflowPhase): WorkflowPhase | null {
  const index = WORKFLOW_PHASES.indexOf(current);
  if (index < 0 || index === WORKFLOW_PHASES.length - 1) return null;
  return WORKFLOW_PHASES[index + 1];
}

export function isFinalPhase(phase: WorkflowPhase) {
  return phase === "Finalization";
}
