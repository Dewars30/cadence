import type { ArtifactIR } from "../../../domain/artifactIR";
import type { IRPatch, IRTarget } from "../../../domain/irPatch";
import type { LLMProvider } from "../../llmProvider";
import type { ArtifactIRRepairProvider } from "../../artifactIRService";
import { validateOrRepairArtifactIR } from "../../artifactIRService";
import { applyPatches } from "../../patch/applyPatches";
import { validateIRPatches } from "../../patch/patchSchema";
import { buildRevisionContext } from "../../contextBuilder";

export type RevisionMode = "patch" | "full";

export type RevisionResult = {
  ir: ArtifactIR;
  patches: IRPatch[];
  repaired: boolean;
};

export async function reviseWithPatches(params: {
  ir: ArtifactIR;
  instruction: string;
  target: IRTarget;
  provider: LLMProvider;
  repairProvider: ArtifactIRRepairProvider;
  revisionMode?: RevisionMode;
}): Promise<RevisionResult> {
  const revisionMode = params.revisionMode ?? "patch";
  if (revisionMode !== "patch") {
    throw new Error("Full regeneration is not enabled in PR6. Use revisionMode=\"patch\".");
  }

  const revisionContext = buildRevisionContext(params.ir, params.target);
  const prompt = [
    "You are Cadence's IR revision engine.",
    "Return ONLY valid JSON with shape: { patches: IRPatch[] }.",
    "Do NOT regenerate the full artifact. Emit only patches.",
    "",
    "Instruction:",
    params.instruction,
    "",
    "Target:",
    JSON.stringify(params.target),
    "",
    "Context (JSON):",
    JSON.stringify(revisionContext),
  ].join("\n");

  const output = await params.provider.generate({
    phase: "Revision",
    prompt,
    context: {
      project: { id: "revision", name: "Revision", readme: "" },
      artifacts: [],
      conversations: [],
    },
    history: [],
  });

  let parsed: { patches?: IRPatch[] };
  try {
    parsed = JSON.parse(output.output_json) as { patches?: IRPatch[] };
  } catch {
    throw new Error("Revision provider returned invalid JSON for patches.");
  }

  const patches = parsed.patches ?? [];
  const validation = validateIRPatches(patches);
  if (!validation.valid) {
    throw new Error(`Revision patches failed validation: ${validation.errors.join("; ")}`);
  }

  const patched = applyPatches(params.ir, patches);
  const repairedResult = await validateOrRepairArtifactIR(
    JSON.stringify(patched),
    params.repairProvider,
    1,
  );

  return { ir: repairedResult.ir, patches, repaired: repairedResult.repaired };
}
