# Cadence — Agent Rules (Warp/Codex)

These rules are **repo law**. If any instruction conflicts with these rules, **follow these rules**.

## Product invariants (do not break)
1. **ArtifactIR is canonical.** DOCX is compiled output only.
2. **Deterministic workflow:** Understanding → Requirements → Scaffolding → Production → Finalization.
   - Phases must remain stable and predictable.
3. **Reproducible exports:** A saved run + inputs must reproduce the same export (within deterministic constraints).
   - DOCX exports must be byte-for-byte deterministic given identical ArtifactIR, template, and compiler version.
4. **No scope creep in MVP:** No cloud sync. No PPTX/XLSX. No plugins/marketplace.
5. **Stable IR IDs:** Existing block/section IDs MUST remain stable across all patch operations; IDs only change on creation/deletion.

## Engineering invariants
1. Prefer **small PRs** (<= 400 LOC net change unless approved).
2. Never mix refactor + feature in the same PR unless strictly necessary.
3. If you touch compiler/export/versioning/workflow:
   - add/adjust tests and golden fixtures as needed.
4. Avoid UI complexity: canvas is **spatial organization + controls**, not a rich editor.

## Security / secrets
- Never commit API keys. For OpenAI integration, read from env or OS keychain (later).
- Do not log secrets in console output.

## Quality gates (must pass locally before PR)
- `npm run lint`
- `npm test`
- `npm run test:e2e` when UI/workflow/export changes

## Review priorities (in order)
P0: data loss, nondeterminism, broken exports, flaky tests, secret leakage  
P1: confusing state transitions, provenance gaps, perf regressions  
P2: style/cleanup

## Where to look first
- Workflow: `src/services/runWorkflow.ts`, `src/domain/phase.ts`
- IR: `src/domain/artifactIR.*`, `src/services/artifactIRService.ts`
- DOCX: `src/services/docxCompiler.ts`, `src/templates/*`
- Tests: `tests/unit/*`, `tests/integration/*`, `tests/e2e/*`
