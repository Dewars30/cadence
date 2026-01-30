import OpenAI from "openai";
import type { LLMProvider, GenerateRequest } from "../../llmProvider";
import { requireEnv, readEnvWithDefault } from "../../env";
import artifactIRSchema from "../../../domain/artifactIR.schema.json";
import { assertOpenAIStrictSchemaCompatible } from "./openaiSchema";
import { validateArtifactIRJson } from "../../../domain/artifactIR";

type ChatCompletionLike = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function extractContent(completion: ChatCompletionLike): string {
  const c = completion?.choices?.[0]?.message?.content;
  if (typeof c !== "string") throw new Error("OpenAI: missing message.content");
  return c;
}

type ValidationResult = { valid: boolean; errors: string[] };

function validateArtifactIRJsonString(raw: string): ValidationResult {
  try {
    const parsed = JSON.parse(raw);
    return validateArtifactIRJson(parsed);
  } catch {
    return { valid: false, errors: ["Invalid JSON; expected valid ArtifactIR JSON."] };
  }
}

let warnedSchemaFallback = false;

export class OpenAILLMProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    // Structured outputs support depends on the model; default to a known snapshot that supports json_schema.
    this.model = readEnvWithDefault("OPENAI_MODEL", "gpt-4o-2024-08-06");
  }

  async generate(req: GenerateRequest) {
    const isRevision = req.phase === "Revision";
    // For now: only enforce strict schema for phases that must output ArtifactIR.
    const mustBeArtifactIR = req.phase === "Production" || req.phase === "Finalization";

    if (isRevision) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: req.temperature ?? 0,
        messages: [
          {
            role: "developer",
            content:
              "You generate IR patches for Cadence. Output ONLY valid JSON with shape: { patches: IRPatch[] }. No prose. No markdown.",
          },
          {
            role: "user",
            content: [req.prompt].join("\n"),
          },
        ],
        response_format: { type: "json_object" },
      });

      return { output_json: extractContent(completion) };
    }

    if (mustBeArtifactIR) {
      let strictCompatible = true;
      try {
        assertOpenAIStrictSchemaCompatible(artifactIRSchema);
      } catch {
        strictCompatible = false;
        if (!warnedSchemaFallback) {
          warnedSchemaFallback = true;
          console.warn(
            "[Cadence] OpenAI strict schema incompatible with ArtifactIR (oneOf). Falling back to JSON-only mode.",
          );
        }
      }

      if (strictCompatible) {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: req.temperature ?? 0,
          messages: [
            {
              role: "developer",
              content:
                "You are Cadence's document generator. Output ONLY valid JSON matching the provided schema. No prose. No markdown.",
            },
            {
              role: "user",
              content: [
                "Generate an ArtifactIR JSON for the user's prompt and context.",
                "",
                "User prompt:",
                req.prompt,
                "",
                "Context (JSON):",
                JSON.stringify(req.context),
                "",
                "History (JSON):",
                JSON.stringify(req.history),
              ].join("\n"),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "artifact_ir",
              schema: artifactIRSchema as unknown as Record<string, unknown>,
              strict: true,
            },
          },
        });

        return { output_json: extractContent(completion) };
      }

      const baseMessages = [
        {
          role: "developer" as const,
          content:
            "You are Cadence's document generator. Output ONLY valid JSON matching the ArtifactIR schema. No prose. No markdown.",
        },
        {
          role: "user" as const,
          content: [
            "Generate an ArtifactIR JSON for the user's prompt and context.",
            "",
            "User prompt:",
            req.prompt,
            "",
            "Context (JSON):",
            JSON.stringify(req.context),
            "",
            "History (JSON):",
            JSON.stringify(req.history),
          ].join("\n"),
        },
      ];

      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: req.temperature ?? 0,
        messages: baseMessages,
        response_format: { type: "json_object" },
      });

      const raw = extractContent(completion);
      const validation = validateArtifactIRJsonString(raw);
      if (validation.valid) {
        return { output_json: raw };
      }

      const retryMessages = [
        {
          role: "developer" as const,
          content:
            "Fix the JSON to match the ArtifactIR schema exactly. Output ONLY valid JSON. No prose. No markdown.",
        },
        {
          role: "user" as const,
          content: [
            "Validation errors:",
            validation.errors.join("\n"),
            "",
            "Bad JSON:",
            raw,
          ].join("\n"),
        },
      ];

      const retry = await this.client.chat.completions.create({
        model: this.model,
        temperature: req.temperature ?? 0,
        messages: retryMessages,
        response_format: { type: "json_object" },
      });

      const retriedRaw = extractContent(retry);
      const retryValidation = validateArtifactIRJsonString(retriedRaw);
      if (retryValidation.valid) {
        return { output_json: retriedRaw };
      }

      throw new Error(
        `OpenAI JSON fallback produced invalid ArtifactIR: ${retryValidation.errors.join("; ")}`,
      );
    }

    // Non-IR phases: keep it simple, still require valid JSON.
    const completion = await this.client.chat.completions.create({
      model: this.model,
      ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
      messages: [
        {
          role: "developer",
          content:
            "You are Cadence's workflow engine. Output ONLY valid JSON. No prose. Include fields: phase, summary, bullets (string[]), risks (string[]), next_steps (string[]).",
        },
        {
          role: "user",
          content: [
            `Phase: ${req.phase}`,
            "",
            "User prompt:",
            req.prompt,
            "",
            "Context (JSON):",
            JSON.stringify(req.context),
            "",
            "History (JSON):",
            JSON.stringify(req.history),
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
    });

    return { output_json: extractContent(completion) };
  }
}
