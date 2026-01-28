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

const replaceSchema = {
  type: "object",
  required: ["op", "target", "value"],
  additionalProperties: false,
  properties: {
    op: { const: "replace" },
    target: targetSchema,
    value: {},
  },
};

const insertSchema = {
  type: "object",
  required: ["op", "target", "values"],
  additionalProperties: false,
  properties: {
    op: { type: "string", enum: ["insert_before", "insert_after"] },
    target: targetSchema,
    values: { type: "array" },
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

const patchSchema = {
  oneOf: [replaceSchema, insertSchema, deleteSchema],
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
