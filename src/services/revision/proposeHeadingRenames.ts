import type { ArtifactIR, ArtifactBlock } from "../../domain/artifactIR";
import type { IRPatch } from "../../domain/irPatch";
import type { LLMProvider } from "../llmProvider";
import { validateIRPatches } from "../patch/patchSchema";

type HeadingSnapshot = { id: string; level: number; text: string };

function extractHeadings(ir: ArtifactIR): HeadingSnapshot[] {
  return ir.blocks
    .filter((block): block is ArtifactBlock & { type: "heading" } => block.type === "heading")
    .map((heading) => ({ id: heading.id, level: heading.level, text: heading.text }));
}

function assertRenameOnlyPatches(patches: IRPatch[]) {
  patches.forEach((patch, index) => {
    if (patch.op !== "rename_heading") {
      throw new Error(`Rename proposal patch ${index + 1} must use op "rename_heading".`);
    }
  });
}

export async function proposeHeadingRenames(params: {
  instruction: string;
  ir: ArtifactIR;
  provider: LLMProvider;
}): Promise<IRPatch[]> {
  const outline = extractHeadings(params.ir);
  const prompt = [
    "You propose heading renames for Cadence.",
    "Return ONLY valid JSON with shape: { patches: IRPatch[] }.",
    "Only emit patches with op \"rename_heading\" targeting { kind: \"section\", id }.",
    "Do NOT emit insert/delete/replace operations.",
    "Do NOT change heading order, levels, or ids.",
    "Use expectedText to match the current heading text when renaming.",
    "If no renames are needed, return { \"patches\": [] }.",
    "",
    "Instruction:",
    params.instruction,
    "",
    "Current outline (JSON):",
    JSON.stringify(outline),
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
    temperature: 0,
  });

  let parsed: { patches?: IRPatch[] };
  try {
    parsed = JSON.parse(output.output_json) as { patches?: IRPatch[] };
  } catch {
    throw new Error("Heading rename provider returned invalid JSON.");
  }

  const patches = parsed.patches ?? [];
  const validation = validateIRPatches(patches);
  if (!validation.valid) {
    throw new Error(`Heading rename patches failed validation: ${validation.errors.join("; ")}`);
  }

  assertRenameOnlyPatches(patches);
  return patches;
}
