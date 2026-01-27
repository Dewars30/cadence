# Cadence — API Contracts (V2)
Version 2.0 | 2026-01-26

## Tauri commands (backend bridge)
- `db.openWorkspace(path)`
- `db.migrate()`
- `db.query(sql, params)`
- `fs.exportDocx(bytes, suggestedName)`
- `fs.exportBundle(zipBytes, suggestedName)`
- `secrets.set(key, value)`
- `secrets.get(key)`

## Domain interfaces (TypeScript)
### LLMProvider
- `complete(messages, options) -> CompletionResult`
- `stream(messages, options) -> AsyncIterator<Token>`
- `embed(texts, options) -> EmbeddingsResult` (optional)

### RunService
- `startRun(projectId, prompt, options) -> runId`
- `advanceRun(runId, userApproval) -> PhaseResult`
- `cancelRun(runId)`

### CompilerService
- `compile(ir, target, templateId) -> BuildResult`
- `validateIR(ir) -> ValidationResult`

### VersionService
- `checkpoint(artifactId, note) -> versionId`
- `lock(versionId)`

