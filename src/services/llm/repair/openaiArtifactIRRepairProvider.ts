import OpenAI from "openai";
import type { ArtifactIRRepairProvider, RepairRequest } from "../../artifactIRService";
import { requireEnv, readEnvWithDefault } from "../../env";
import artifactIRSchema from "../../../domain/artifactIR.schema.json";

type ChatCompletionLike = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function extractContent(completion: ChatCompletionLike): string {
  const c = completion?.choices?.[0]?.message?.content;
  if (typeof c !== "string") throw new Error("OpenAI repair: missing message.content");
  return c;
}

export class OpenAIArtifactIRRepairProvider implements ArtifactIRRepairProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    this.model = readEnvWithDefault("OPENAI_MODEL", "gpt-4o-2024-08-06");
  }

  async repair(req: RepairRequest): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "developer",
          content:
            "You repair invalid ArtifactIR JSON. Output ONLY valid JSON matching the provided schema. No prose. No markdown.",
        },
        {
          role: "user",
          content: [
            "Fix the JSON to match the ArtifactIR schema exactly.",
            "",
            "Validation errors:",
            JSON.stringify(req.errors),
            "",
            "Bad JSON:",
            req.rawJson,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "artifact_ir_repair",
          schema: artifactIRSchema as unknown as Record<string, unknown>,
          strict: true,
        },
      },
    });

    return extractContent(completion);
  }
}
