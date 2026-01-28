import type { ArtifactIR, ArtifactBlock } from "../../domain/artifactIR";
import type { IRPatch, IRTarget } from "../../domain/irPatch";
import { validateIRPatches } from "./patchSchema";

type SectionRange = { start: number; end: number; heading: ArtifactBlock & { type: "heading" } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableBlockId(index: number) {
  return `block_${String(index).padStart(3, "0")}`;
}

function ensureBlockIds(ir: ArtifactIR): ArtifactIR {
  const blocks = ir.blocks.map((block, index) => {
    const b = block as ArtifactBlock & { id?: string };
    if (b.id && b.id.length > 0) return b;
    return { ...b, id: stableBlockId(index + 1) } as ArtifactBlock;
  });
  return { ...ir, blocks };
}

function findBlockIndex(blocks: ArtifactBlock[], id: string): number {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0) throw new Error(`Patch target block not found: ${id}`);
  return index;
}

function resolveSectionRange(blocks: ArtifactBlock[], sectionId: string): SectionRange {
  const start = findBlockIndex(blocks, sectionId);
  const heading = blocks[start];
  if (heading.type !== "heading") {
    throw new Error(`Section target must reference a heading block id: ${sectionId}`);
  }
  const level = heading.level;
  let end = blocks.length - 1;
  for (let i = start + 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= level) {
      end = i - 1;
      break;
    }
  }
  return { start, end, heading };
}

function normalizeBlock(
  value: unknown,
  fallbackId: string,
  existingIds: Set<string>,
  allowExistingId?: string,
): ArtifactBlock {
  if (!isRecord(value)) {
    throw new Error("Patch value must be an object matching ArtifactIR block schema.");
  }
  const block = { ...value } as Record<string, unknown> & { id?: string; type?: string };
  if (!block.type || typeof block.type !== "string") {
    throw new Error("Patch block value missing required type.");
  }
  if (!block.id || typeof block.id !== "string") {
    block.id = fallbackId;
  }
  let candidate = block.id;
  let suffix = 1;
  while (existingIds.has(candidate) && candidate !== allowExistingId) {
    candidate = `${block.id}_${suffix}`;
    suffix += 1;
  }
  block.id = candidate;
  if (!existingIds.has(candidate)) {
    existingIds.add(candidate);
  }
  return block as ArtifactBlock;
}

function normalizeBlocks(
  values: unknown,
  patchIndex: number,
  insertIndex: number,
  existingIds: Set<string>,
): ArtifactBlock[] {
  const list = Array.isArray(values) ? values : [values];
  return list.map((value, valueIndex) => {
    const fallbackId = `patch_${String(patchIndex + 1).padStart(3, "0")}_${String(
      insertIndex + valueIndex + 1,
    ).padStart(3, "0")}`;
    return normalizeBlock(value, fallbackId, existingIds);
  });
}

function getTargetRange(
  blocks: ArtifactBlock[],
  target: IRTarget,
): { index: number; section?: SectionRange } {
  if (target.kind === "block") {
    return { index: findBlockIndex(blocks, target.id) };
  }
  const section = resolveSectionRange(blocks, target.id);
  return { index: section.start, section };
}

function assertDeleteAllowed(blocks: ArtifactBlock[], start: number, end: number) {
  for (let i = start; i <= end; i += 1) {
    if (blocks[i]?.type === "titlePage") {
      throw new Error("Patch delete cannot remove required titlePage block.");
    }
  }
}

export function applyPatches(ir: ArtifactIR, patches: IRPatch[]): ArtifactIR {
  const validation = validateIRPatches(patches);
  if (!validation.valid) {
    throw new Error(`Invalid patch payload: ${validation.errors.join("; ")}`);
  }

  const base = ensureBlockIds(ir);
  const blocks = [...base.blocks];
  const existingIds = new Set(blocks.map((block) => block.id));

  patches.forEach((patch, patchIndex) => {
    if (patch.op === "replace") {
      if (patch.target.kind === "section") {
        const section = resolveSectionRange(blocks, patch.target.id);
        if (!Array.isArray(patch.value)) {
          throw new Error("Section replace expects value to be an array of body blocks.");
        }
        const replacement = normalizeBlocks(patch.value, patchIndex, section.start + 1, existingIds);
        blocks.splice(section.start + 1, section.end - section.start, ...replacement);
        return;
      }
      const index = findBlockIndex(blocks, patch.target.id);
      const replacement = normalizeBlock(patch.value, blocks[index].id, existingIds, blocks[index].id);
      blocks[index] = replacement;
      return;
    }

    if (patch.op === "insert_before" || patch.op === "insert_after") {
      const { index, section } = getTargetRange(blocks, patch.target);
      const insertAt = patch.op === "insert_before" ? index : section ? section.end + 1 : index + 1;
      const inserts = normalizeBlocks(patch.values, patchIndex, insertAt, existingIds);
      blocks.splice(insertAt, 0, ...inserts);
      return;
    }

    if (patch.op === "delete") {
      if (patch.target.kind === "section") {
        const section = resolveSectionRange(blocks, patch.target.id);
        assertDeleteAllowed(blocks, section.start, section.end);
        blocks.splice(section.start, section.end - section.start + 1);
        return;
      }
      const index = findBlockIndex(blocks, patch.target.id);
      assertDeleteAllowed(blocks, index, index);
      blocks.splice(index, 1);
    }
  });

  return { ...base, blocks };
}
