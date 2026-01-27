# Cadence MVP
Local-first desktop workspace for producing structured deliverables (DOCX) via a deterministic workflow and spatial canvas.

## Value proposition
- **Structured output**: ArtifactIR → deterministic DOCX compilation.
- **Spatial context**: canvas nodes for chat, artifacts, and scratchpads.
- **Deterministic workflow**: Understanding → Requirements → Scaffolding → Production → Finalization with checkpoints and final locks.

## MVP scope
- Tauri 2.x + React + TypeScript
- tldraw canvas with custom nodes
- SQLite persistence
- DOCX export only (no cloud sync, no PPTX/XLSX, no plugins)

## Getting started
### Prereqs
- Node.js 18+
- Rust toolchain (for Tauri desktop builds)

### Install
```
npm install
```

### Run (web dev)
```
npm run dev
```

### Run (Tauri desktop)
```
npm run tauri dev
```

### Tests
```
npm test
npm run test:e2e
```

## Hero loop (MVP)
1. Click **New Artifact** on the canvas toolbar.
2. In the inspector, click **Start Run**.
3. Click **Approve Phase** until phase shows **Production**.
4. Click **Checkpoint V1**.
5. Click **Export DOCX** and save the file.

## Project structure
- `docs/` product + architecture docs
- `schema/` SQLite schema
- `src/` app UI + services
- `fixtures/` ArtifactIR fixtures
- `tests/` unit/integration + Playwright E2E

## Notes
- LLM calls are mocked in MVP (`MockLLMProvider`).
- ArtifactIR output is validated and repaired if invalid.
- DOCX export includes title page, TOC, headings, table, and bullets.
