import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

const targetSchema = {
  type: "object",
  required: ["kind", "id"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["section", "block"] },
    id: { type: "string" },
  },
};
const blockTargetSchema = {
  type: "object",
  required: ["kind", "id"],
  additionalProperties: false,
  properties: {
    kind: { const: "block" },
    id: { type: "string" },
  },
};

const sectionTargetSchema = {
  type: "object",
  required: ["kind", "id"],
  additionalProperties: false,
  properties: {
    kind: { const: "section" },
    id: { type: "string" },
  },
};

const replaceBlockSchema = {
  type: "object",
  required: ["op", "target", "value"],
  additionalProperties: false,
  properties: {
    op: { const: "replace" },
    target: blockTargetSchema,
    value: { type: "object" },
  },
};

const replaceSectionSchema = {
  type: "object",
  required: ["op", "target", "value"],
  additionalProperties: false,
  properties: {
    op: { const: "replace" },
    target: sectionTargetSchema,
    value: { type: "array", items: { type: "object" } },
  },
};


const insertSchema = {
  type: "object",
  required: ["op", "target", "values"],
  additionalProperties: false,
  properties: {
    op: { type: "string", enum: ["insert_before", "insert_after"] },
    target: targetSchema,
    values: { type: "array", items: { type: "object" } },
  },
};

const deleteSchema = {
  type: "object",
  required: ["op", "target"],
  additionalProperties: false,
  properties: {
    op: { const: "delete" },
    target: targetSchema,
  },
};
const renameHeadingSchema = {
  type: "object",
  required: ["op", "target", "newText"],
  additionalProperties: false,
  properties: {
    op: { const: "rename_heading" },
    target: sectionTargetSchema,
    newText: { type: "string", minLength: 1, maxLength: 140 },
    expectedText: { type: "string", minLength: 1 },
  },
};

const patchSchema = {
  oneOf: [replaceBlockSchema, replaceSectionSchema, insertSchema, deleteSchema, renameHeadingSchema],
};

const patchListSchema = {
  type: "array",
  items: patchSchema,
};

const validatePatch = ajv.compile(patchSchema);
const validatePatchList = ajv.compile(patchListSchema);

export function validateIRPatch(patch: unknown) {
  const valid = validatePatch(patch);
  return {
    valid,
    errors: validatePatch.errors?.map((err) => `${err.instancePath} ${err.message}`) ?? [],
  };
}

export function validateIRPatches(patches: unknown) {
  const valid = validatePatchList(patches);
  return {
    valid,
    errors: validatePatchList.errors?.map((err) => `${err.instancePath} ${err.message}`) ?? [],
  };
}
