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

type BaseBlock = {
  id: string;
};

export type ArtifactBlock =
  | (BaseBlock & { type: "titlePage"; title: string; subtitle?: string })
  | (BaseBlock & { type: "heading"; level: number; text: string })
  | (BaseBlock & { type: "paragraph"; text: string })
  | (BaseBlock & { type: "bullets"; items: string[] })
  | (BaseBlock & { type: "numbered"; items: string[] })
  | (BaseBlock & { type: "table"; columns: string[]; rows: string[][] })
  | (BaseBlock & { type: "pageBreak" });

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
