# Cadence — Architecture (V2)
Version 2.0 | 2026-01-26

## Stack (baseline)
- Tauri 2.x desktop shell fileciteturn8file0L82-L83
- React UI + tldraw SDK 4.x canvas fileciteturn8file0L70-L72
- SQLite (local-first); optional CRDT later fileciteturn8file0L134-L138
- Document generation: docx-js (MVP), pptxgenjs/exceljs later fileciteturn8file0L107-L123

## Runtime architecture
### Frontend (React)
- Canvas view (tldraw)
- Side panels: Chat, Inspector, Version Timeline, Export
- In-app previews (HTML-based for MVP)

### Backend (Tauri / Rust minimal)
- SQLite access (via plugin or bundled driver)
- Filesystem write/read (exports + project bundles)
- Keychain for API keys
- Logging

## Core services (TypeScript)
1. ProjectService
2. CanvasService
3. VersionService
4. RunService (workflow runner)
5. LLMService (provider adapter)
6. CompilerService (IR → targets)
7. TemplateService

## Suggested boundaries
- `domain/` pure types + business rules
- `services/` orchestration + persistence
- `adapters/` LLM providers + compilers + Tauri bridge
- `ui/` React components

## Error model (important)
- Compiler errors are first-class UI citizens (actionable, with remediation).
- LLM output validation failures should produce “repair prompts” + retry.

