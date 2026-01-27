import Anthropic from "@anthropic-ai/sdk";
import type { ArtifactIRRepairProvider, RepairRequest } from "../../artifactIRService";
import { requireEnv, readEnvWithDefault } from "../../env";
import artifactIRSchema from "../../../domain/artifactIR.schema.json";

function extractToolInput(message: Anthropic.Message, toolName: string): unknown | null {
  const block = message.content.find((b): b is Anthropic.ToolUseBlock => {
    return b.type === "tool_use" && b.name === toolName;
  });
  if (!block) return null;
  return block.input ?? null;
}

export class AnthropicArtifactIRRepairProvider implements ArtifactIRRepairProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
    this.model = readEnvWithDefault("ANTHROPIC_MODEL", "claude-sonnet-4-20250514");
  }

  async repair(req: RepairRequest): Promise<string> {
    const toolName = "emit_repaired_artifact_ir";
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system:
        "You repair invalid ArtifactIR JSON. Use the tool to emit ONLY the repaired ArtifactIR object. No extra fields.",
      messages: [
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
      tools: [
        {
          name: toolName,
          description: "Emit the repaired ArtifactIR JSON object for Cadence.",
          input_schema: artifactIRSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    });

    const input = extractToolInput(msg, toolName);
    if (!input) throw new Error("Anthropic repair: missing tool_use input");
    return JSON.stringify(input);
  }
}
