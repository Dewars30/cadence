import type { ArtifactIR } from "../../../domain/artifactIR";
import type { IRPatch, IRTarget } from "../../../domain/irPatch";
import type { HeadingRename, RevisionMode } from "../../../domain/revisionLog";
import type { LLMProvider } from "../../llmProvider";
import type { ArtifactIRRepairProvider } from "../../artifactIRService";
import { validateOrRepairArtifactIR } from "../../artifactIRService";
import { applyPatches } from "../../patch/applyPatches";
import { validateIRPatches } from "../../patch/patchSchema";
import { buildRevisionContext } from "../../contextBuilder";
import { validateOutlineInvariants } from "../../revision/outlineValidation";
import { proposeHeadingRenames } from "../../revision/proposeHeadingRenames";


export type RevisionResult = {
  ir: ArtifactIR;
  patches: IRPatch[];
  repaired: boolean;
  outlineRepaired: boolean;
  mode: RevisionMode;
  headingRenames?: HeadingRename[];
};
type AllowedRenames = Map<string, { from: string; to: string }>;
function getHeadingTextMap(ir: ArtifactIR) {
  const map = new Map<string, string>();
  ir.blocks.forEach((block) => {
    if (block.type === "heading") map.set(block.id, block.text);
  });
  return map;
}
function collectHeadingRenames(
  original: ArtifactIR,
  updated: ArtifactIR,
  renamePatches: IRPatch[],
): HeadingRename[] {
  if (renamePatches.length === 0) return [];
  const before = getHeadingTextMap(original);
  const after = getHeadingTextMap(updated);
  const seen = new Set<string>();
  const renames: HeadingRename[] = [];
  renamePatches.forEach((patch) => {
    if (patch.op !== "rename_heading") return;
    const id = patch.target.id;
    if (seen.has(id)) {
      throw new Error(`Duplicate heading rename patch for id ${id}.`);
    }
    seen.add(id);
    const from = before.get(id);
    const to = after.get(id);
    if (!from || !to) {
      throw new Error(`Heading rename id not found in outline: ${id}.`);
    }
    if (from !== to) {
      renames.push({ id, from, to });
    }
  });
  return renames;
}
function buildAllowedRenames(renames: HeadingRename[]): AllowedRenames | undefined {
  if (renames.length === 0) return undefined;
  const map: AllowedRenames = new Map();
  renames.forEach((rename) => {
    map.set(rename.id, { from: rename.from, to: rename.to });
  });
  return map;
}
function getRenamePatches(patches: IRPatch[]) {
  return patches.filter((patch) => patch.op === "rename_heading");
}
function assertRenamePatchesAllowed(renamePatches: IRPatch[], allowHeadingRenames: boolean) {
  if (renamePatches.length > 0 && !allowHeadingRenames) {
    throw new Error("rename_heading patches require [[ALLOW_HEADING_RENAMES]].");
  }
}
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
  allowHeadingRenames?: boolean;
}): Promise<RevisionResult> {
  const revisionMode = params.revisionMode ?? "patch";
  const allowHeadingRenames = params.allowHeadingRenames ?? false;
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
      headingRenames: [],
    };
  }
  if (revisionMode === "full_regen_locked_outline") {
    let baseIr = params.ir;
    let renamePatches: IRPatch[] = [];
    if (allowHeadingRenames) {
      renamePatches = await proposeHeadingRenames({
        instruction: params.instruction,
        ir: baseIr,
        provider: params.provider,
      });
      baseIr = applyPatches(baseIr, renamePatches);
    }
    const headingRenames = collectHeadingRenames(params.ir, baseIr, renamePatches);
    const allowedRenames = buildAllowedRenames(headingRenames);
    const regen = await regenerateArtifact({
      instruction: params.instruction,
      original: baseIr,
      mode: revisionMode,
      provider: params.provider,
      repairProvider: params.repairProvider,
    });
    const outlineCheck = validateOutlineInvariants(baseIr, regen.ir, {
      allowedRenames,
    });
    if (!outlineCheck.valid) {
      const repaired = await regenerateArtifact({
        instruction: params.instruction,
        original: baseIr,
        mode: revisionMode,
        provider: params.provider,
        repairProvider: params.repairProvider,
        violations: outlineCheck.violations,
      });
      const secondCheck = validateOutlineInvariants(baseIr, repaired.ir, {
        allowedRenames,
      });
      if (!secondCheck.valid) {
        throw new Error(
          `Locked-outline regeneration violated invariants: ${secondCheck.violations.join("; ")}`,
        );
      }
      return {
        ir: repaired.ir,
        patches: renamePatches,
        repaired: repaired.repaired,
        outlineRepaired: true,
        mode: revisionMode,
        headingRenames,
      };
    }
    return {
      ir: regen.ir,
      patches: renamePatches,
      repaired: regen.repaired,
      outlineRepaired: false,
      mode: revisionMode,
      headingRenames,
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
  const renamePatches = getRenamePatches(patches);
  assertRenamePatchesAllowed(renamePatches, allowHeadingRenames);

  const patched = applyPatches(params.ir, patches);
  const headingRenames = collectHeadingRenames(params.ir, patched, renamePatches);
  const allowedRenames = buildAllowedRenames(headingRenames);
  const outlineCheck = validateOutlineInvariants(params.ir, patched, { allowedRenames });
  if (!outlineCheck.valid) {
    throw new Error(`Patch revision violated outline invariants: ${outlineCheck.violations.join("; ")}`);
  }

  const repairedResult = await validateOrRepairArtifactIR(
    JSON.stringify(patched),
    params.repairProvider,
    1,
  );
  const repairedOutlineCheck = validateOutlineInvariants(params.ir, repairedResult.ir, {
    allowedRenames,
  });
  if (!repairedOutlineCheck.valid) {
    throw new Error(
      `Patch revision violated outline invariants after repair: ${repairedOutlineCheck.violations.join("; ")}`,
    );
  }

  return {
    ir: repairedResult.ir,
    patches,
    repaired: repairedResult.repaired,
    outlineRepaired: false,
    mode: revisionMode,
    headingRenames,
  };
}
