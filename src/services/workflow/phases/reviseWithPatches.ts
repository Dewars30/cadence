import type { ArtifactIR } from "../../../domain/artifactIR";
import type { IRPatch, IRTarget } from "../../../domain/irPatch";
import type { RevisionMode } from "../../../domain/revisionLog";
import type { LLMProvider } from "../../llmProvider";
import type { ArtifactIRRepairProvider } from "../../artifactIRService";
import { validateOrRepairArtifactIR } from "../../artifactIRService";
import { applyPatches } from "../../patch/applyPatches";
import { validateIRPatches } from "../../patch/patchSchema";
import { buildRevisionContext } from "../../contextBuilder";
import { validateOutlineInvariants } from "../../revision/outlineValidation";


export type RevisionResult = {
  ir: ArtifactIR;
  patches: IRPatch[];
  repaired: boolean;
  outlineRepaired: boolean;
  mode: RevisionMode;
};
function buildRegenPrompt(params: {
  instruction: string;
  original: ArtifactIR;
  mode: RevisionMode;
  violations?: string[];
}) {
  const outline = params.original.blocks
    .filter((block) => block.type === "heading")
    .map((heading) => ({
      id: heading.id,
      level: heading.level,
      text: heading.text,
    }));
  const lines = [
    "You are Cadence's ArtifactIR regeneration engine.",
    "Return ONLY valid JSON that matches the ArtifactIR schema.",
    "",
  ];
  if (params.mode === "full_regen_locked_outline") {
    lines.push(
      "You MUST preserve the outline exactly:",
      "- Heading count, order, level, text, and id must remain unchanged.",
      "- Only body blocks may change.",
      "",
    );
  } else if (params.mode === "full_regen_allow_reflow") {
    lines.push(
      "You may change the outline structure as needed.",
      "Preserve existing heading IDs when the heading text is identical.",
      "",
    );
  }
  if (params.violations && params.violations.length > 0) {
    lines.push("Previous output violated outline invariants:", ...params.violations, "");
  }
  lines.push(
    "Instruction:",
    params.instruction,
    "",
    "Current outline (JSON):",
    JSON.stringify(outline),
    "",
    "Current artifact IR (JSON):",
    JSON.stringify(params.original),
  );
  return lines.join("\n");
}

async function regenerateArtifact(params: {
  instruction: string;
  original: ArtifactIR;
  mode: RevisionMode;
  provider: LLMProvider;
  repairProvider: ArtifactIRRepairProvider;
  violations?: string[];
}) {
  const prompt = buildRegenPrompt({
    instruction: params.instruction,
    original: params.original,
    mode: params.mode,
    violations: params.violations,
  });
  const output = await params.provider.generate({
    phase: "Production",
    prompt,
    context: {
      project: { id: "revision", name: "Revision", readme: "" },
      artifacts: [],
      conversations: [],
    },
    history: [],
  });
  return validateOrRepairArtifactIR(output.output_json, params.repairProvider, 1);
}

export async function reviseWithPatches(params: {
  ir: ArtifactIR;
  instruction: string;
  target: IRTarget;
  provider: LLMProvider;
  repairProvider: ArtifactIRRepairProvider;
  revisionMode?: RevisionMode;
}): Promise<RevisionResult> {
  const revisionMode = params.revisionMode ?? "patch";
  if (revisionMode === "full_regen_allow_reflow") {
    const regen = await regenerateArtifact({
      instruction: params.instruction,
      original: params.ir,
      mode: revisionMode,
      provider: params.provider,
      repairProvider: params.repairProvider,
    });
    return {
      ir: regen.ir,
      patches: [],
      repaired: regen.repaired,
      outlineRepaired: false,
      mode: revisionMode,
    };
  }
  if (revisionMode === "full_regen_locked_outline") {
    const regen = await regenerateArtifact({
      instruction: params.instruction,
      original: params.ir,
      mode: revisionMode,
      provider: params.provider,
      repairProvider: params.repairProvider,
    });
    const outlineCheck = validateOutlineInvariants(params.ir, regen.ir);
    if (!outlineCheck.valid) {
      const repaired = await regenerateArtifact({
        instruction: params.instruction,
        original: params.ir,
        mode: revisionMode,
        provider: params.provider,
        repairProvider: params.repairProvider,
        violations: outlineCheck.violations,
      });
      const secondCheck = validateOutlineInvariants(params.ir, repaired.ir);
      if (!secondCheck.valid) {
        throw new Error(
          `Locked-outline regeneration violated invariants: ${secondCheck.violations.join("; ")}`,
        );
      }
      return {
        ir: repaired.ir,
        patches: [],
        repaired: repaired.repaired,
        outlineRepaired: true,
        mode: revisionMode,
      };
    }
    return {
      ir: regen.ir,
      patches: [],
      repaired: regen.repaired,
      outlineRepaired: false,
      mode: revisionMode,
    };
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

  return {
    ir: repairedResult.ir,
    patches,
    repaired: repairedResult.repaired,
    outlineRepaired: false,
    mode: revisionMode,
  };
}
