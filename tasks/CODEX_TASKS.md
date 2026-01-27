# Codex Task List — Cadence MVP (V2)

## 0. Guardrails
- Build ONLY MVP scope (DOCX export only).
- No cloud sync.
- No PPTX/XLSX.

## 1. Repo scaffold
- Tauri 2 + React + TypeScript
- ESLint/Prettier + Vitest + Playwright

## 2. Data layer
- Implement SQLite schema (migrations)
- CRUD services: Workspace, Project, CanvasNode, Artifact, Version, Conversation, Message

## 3. Canvas
- tldraw integration
- Custom shapes:
  - ChatNode
  - ArtifactNode
  - ScratchpadNode
- Node inspector (metadata + version timeline)

## 4. AI workflow runner
- Define phase state machine
- Implement RunService (start, advance, pause)
- Implement ContextBuilder (project readme + selected artifacts + summaries)
- LLMProvider adapter (pluggable)

## 5. ArtifactIR + compiler
- Define JSON schema for ArtifactIR
- Validate LLM output; auto-repair loop
- Implement DOCX compiler adapter using docx-js
- Implement template pack: `consulting_report_v1`

## 6. Export & bundles
- Export DOCX to filesystem via Tauri
- Export “project bundle” zip (db + assets + manifest)

## 7. Tests
- Golden IR fixtures → DOCX snapshot tests
- E2E hero loop test

## 8. Done definition
- User can produce a report end-to-end and export DOCX without manual formatting.

