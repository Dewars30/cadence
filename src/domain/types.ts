export type Workspace = {
  id: string;
  name: string;
  created_at: string;
  settings_json: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  readme: string;
  ai_context_json: string;
  created_at: string;
};

export type CanvasNode = {
  id: string;
  project_id: string;
  node_type: "chat" | "artifact" | "scratchpad" | "phase_report";
  ref_id: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  created_at: string;
};

export type Conversation = {
  id: string;
  project_id: string;
  title: string;
  summary: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  created_at: string;
};

export type Artifact = {
  id: string;
  project_id: string;
  artifact_type: "report" | "prd" | "deck" | "memo" | "custom";
  title: string;
  current_version_id: string | null;
  created_at: string;
};

export type ArtifactVersion = {
  id: string;
  artifact_id: string;
  version_label: "Draft" | "V1" | "V2" | "Final";
  status: "draft" | "checkpoint" | "final";
  locked_at: string | null;
  content_json: string;
  created_at: string;
};

export type StyleTemplate = {
  id: string;
  project_id: string | null;
  name: string;
  config_json: string;
  created_at: string;
};

export type Run = {
  id: string;
  project_id: string;
  artifact_id: string | null;
  phase: string;
  status: "running" | "paused" | "complete" | "failed" | "canceled";
  started_at: string;
  ended_at: string | null;
};

export type RunStep = {
  id: string;
  run_id: string;
  phase: string;
  input_json: string;
  output_json: string;
  created_at: string;
};

export type Build = {
  id: string;
  artifact_version_id: string;
  target: "docx" | "pdf" | "pptx" | "xlsx";
  template_id: string | null;
  file_name: string;
  file_path: string;
  created_at: string;
};
