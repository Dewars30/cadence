import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./artifactIR.schema.json";

export type ArtifactIR = {
  artifact: {
    id: string;
    type: "report" | "prd" | "deck" | "memo" | "custom";
    title: string;
    template: string;
  };
  blocks: ArtifactBlock[];
  assets?: Array<{
    id: string;
    type: string;
    path: string;
    alt?: string;
  }>;
  styles?: Record<string, unknown>;
};

export type ArtifactBlock =
  | { type: "titlePage"; title: string; subtitle?: string }
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "pageBreak" };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateArtifactIR = ajv.compile<ArtifactIR>(schema);

export function validateArtifactIRJson(ir: unknown) {
  const valid = validateArtifactIR(ir);
  return {
    valid,
    errors: validateArtifactIR.errors?.map((err) => `${err.instancePath} ${err.message}`) ?? [],
  };
}
