-- Cadence SQLite schema (V2) — minimal MVP
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  readme TEXT NOT NULL DEFAULT '',
  ai_context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canvas_node (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,           -- chat|artifact|scratchpad|phase_report
  ref_id TEXT,                       -- conversation_id or artifact_id
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  w REAL NOT NULL DEFAULT 400,
  h REAL NOT NULL DEFAULT 280,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                -- system|user|assistant|tool
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifact (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,        -- report|prd|deck|memo|custom
  title TEXT NOT NULL,
  current_version_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifact_version (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES artifact(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,        -- Draft|V1|V2|Final
  status TEXT NOT NULL,               -- draft|checkpoint|final
  locked_at TEXT,
  content_json TEXT NOT NULL,         -- ArtifactIR JSON
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS style_template (
  id TEXT PRIMARY KEY,
  project_id TEXT,                    -- NULL means global
  name TEXT NOT NULL,
  config_json TEXT NOT NULL,          -- token set
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  artifact_id TEXT,                   -- primary artifact produced
  phase TEXT NOT NULL,
  status TEXT NOT NULL,               -- running|paused|complete|failed|canceled
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS run_step (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS build (
  id TEXT PRIMARY KEY,
  artifact_version_id TEXT NOT NULL REFERENCES artifact_version(id) ON DELETE CASCADE,
  target TEXT NOT NULL,               -- docx|pdf|pptx|xlsx
  template_id TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);
