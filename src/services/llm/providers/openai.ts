import OpenAI from "openai";
import type { LLMProvider, GenerateRequest } from "../../llmProvider";
import { requireEnv, readEnvWithDefault } from "../../env";
import artifactIRSchema from "../../../domain/artifactIR.schema.json";

type ChatCompletionLike = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function extractContent(completion: ChatCompletionLike): string {
  const c = completion?.choices?.[0]?.message?.content;
  if (typeof c !== "string") throw new Error("OpenAI: missing message.content");
  return c;
}

export class OpenAILLMProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    // Structured outputs support depends on the model; default to a known snapshot that supports json_schema.
    this.model = readEnvWithDefault("OPENAI_MODEL", "gpt-4o-2024-08-06");
  }

  async generate(req: GenerateRequest) {
    // For now: only enforce strict schema for phases that must output ArtifactIR.
    const mustBeArtifactIR = req.phase === "Production" || req.phase === "Finalization";

    if (mustBeArtifactIR) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
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

    // Non-IR phases: keep it simple, still require valid JSON.
    const completion = await this.client.chat.completions.create({
      model: this.model,
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
