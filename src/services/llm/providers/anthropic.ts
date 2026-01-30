import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, GenerateRequest } from "../../llmProvider";
import { requireEnv, readEnvWithDefault } from "../../env";
import artifactIRSchema from "../../../domain/artifactIR.schema.json";

function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return "";
  return block.text ?? "";
}

function extractToolInput(message: Anthropic.Message, toolName: string): unknown | null {
  const block = message.content.find((b): b is Anthropic.ToolUseBlock => {
    return b.type === "tool_use" && b.name === toolName;
  });
  if (!block) return null;
  return block.input ?? null;
}

export class AnthropicLLMProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
    this.model = readEnvWithDefault("ANTHROPIC_MODEL", "claude-sonnet-4-20250514");
  }

  async generate(req: GenerateRequest) {
    const isRevision = req.phase === "Revision";
    const mustBeArtifactIR = req.phase === "Production" || req.phase === "Finalization";

    if (isRevision) {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
        system:
          "You generate IR patches for Cadence. Output ONLY valid JSON with shape: { patches: IRPatch[] }. No prose. No markdown.",
        messages: [
          {
            role: "user",
            content: [req.prompt].join("\n"),
          },
        ],
      });

      const text = extractText(msg).trim();
      if (!text) throw new Error("Anthropic: empty text response");
      return { output_json: text };
    }

    if (mustBeArtifactIR) {
      const toolName = "emit_artifact_ir";
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
        system:
          "You are Cadence's document generator. Use the provided tool to emit ONLY the ArtifactIR object matching the schema. Do not add any extra fields.",
        messages: [
          {
            role: "user",
            content: [
              "Generate an ArtifactIR for the user's prompt and context.",
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
        tools: [
          {
            name: toolName,
            description: "Emit the ArtifactIR JSON object for Cadence.",
            input_schema: artifactIRSchema as unknown as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: toolName },
      });

      const input = extractToolInput(msg, toolName);
      if (!input) throw new Error("Anthropic: missing tool_use input for ArtifactIR");
      return { output_json: JSON.stringify(input) };
    }

    // Non-IR phases: ask for JSON only. (We keep it light until phase schemas exist.)
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
      system:
        "You are Cadence's workflow engine. Output ONLY valid JSON. No prose. Include fields: phase, summary, bullets (string[]), risks (string[]), next_steps (string[]).",
      messages: [
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
    });

    const text = extractText(msg).trim();
    if (!text) throw new Error("Anthropic: empty text response");
    return { output_json: text };
  }
}
