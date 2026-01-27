import type { WorkflowPhase } from "../domain/phase";
import type { RunContext } from "./contextBuilder";

export type LLMRequest = {
  phase: WorkflowPhase;
  prompt: string;
  context: RunContext;
  history: Array<{ phase: WorkflowPhase; output_json: string }>;
};

export type LLMResult = {
  phase: WorkflowPhase;
  output_json: string;
};

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResult>;
}

export class MockLLMProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<LLMResult> {
    if (request.phase === "Production" || request.phase === "Finalization") {
      const ir = {
        artifact: {
          id: "art_mock",
          type: "report",
          title: `${request.context.project.name} Report`,
          template: "consulting_report_v1",
        },
        blocks: [
          { type: "titlePage", title: `${request.context.project.name} Report`, subtitle: "V1 Draft" },
          { type: "heading", level: 1, text: "Executive Summary" },
          { type: "paragraph", text: "Cadence compiles structured artifacts into polished DOCX output." },
          { type: "bullets", items: ["Spatial canvas context", "Deterministic workflow", "DOCX export"] },
          {
            type: "table",
            columns: ["Metric", "Target"],
            rows: [
              ["Time-to-export", "<10 min"],
              ["Export success", ">95%"],
            ],
          },
        ],
      };
      return { phase: request.phase, output_json: JSON.stringify(ir, null, 2) };
    }

    const base = {
      phase: request.phase,
      prompt: request.prompt,
      project: request.context.project.name,
      timestamp: new Date().toISOString(),
    };

    const output = {
      ...base,
      summary: `${request.phase} summary for ${request.context.project.name}`,
      notes: request.context.project.readme ? "Readme included." : "No readme provided.",
    };

    return { phase: request.phase, output_json: JSON.stringify(output, null, 2) };
  }
}
