import type { ArtifactIR, ArtifactBlock } from "../../domain/artifactIR";

type HeadingSnapshot = { id: string; level: number; text: string };

function extractHeadings(ir: ArtifactIR): HeadingSnapshot[] {
  return ir.blocks
    .filter((block): block is ArtifactBlock & { type: "heading" } => block.type === "heading")
    .map((heading) => ({ id: heading.id, level: heading.level, text: heading.text }));
}

export function validateOutlineInvariants(
  original: ArtifactIR,
  generated: ArtifactIR,
): { valid: boolean; violations: string[] } {
  const originalHeadings = extractHeadings(original);
  const generatedHeadings = extractHeadings(generated);
  const violations: string[] = [];

  if (originalHeadings.length !== generatedHeadings.length) {
    violations.push(
      `Heading count changed from ${originalHeadings.length} to ${generatedHeadings.length}.`,
    );
  }

  const count = Math.min(originalHeadings.length, generatedHeadings.length);
  for (let i = 0; i < count; i += 1) {
    const before = originalHeadings[i];
    const after = generatedHeadings[i];
    if (before.id !== after.id) {
      violations.push(`Heading ${i + 1} id changed from ${before.id} to ${after.id}.`);
    }
    if (before.level !== after.level) {
      violations.push(`Heading ${i + 1} level changed from ${before.level} to ${after.level}.`);
    }
    if (before.text !== after.text) {
      violations.push(`Heading ${i + 1} text changed from "${before.text}" to "${after.text}".`);
    }
  }

  return { valid: violations.length === 0, violations };
}
