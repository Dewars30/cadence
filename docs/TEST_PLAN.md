# Cadence — Test Plan (V2)
Version 2.0 | 2026-01-26

## Unit tests
- IR schema validation (valid + invalid fixtures)
- DOCX compiler snapshot tests (golden fixtures)
- Version lifecycle rules (draft→checkpoint→final)
- State machine transition rules

## Integration tests
- Start Run -> produces phase artifacts
- Compile generated IR -> produces DOCX bytes

## E2E tests (Playwright)
Scenario: Hero loop export
1) Create Project
2) Start Run with prompt
3) Approve phases to Production
4) Checkpoint V1
5) Export DOCX
Assertions:
- export exists on disk
- document contains expected headings and table
- version list shows V1

## Golden fixtures
- `fixtures/ir/report_basic.json`
- `fixtures/ir/report_table_heavy.json`
- `fixtures/ir/report_long_toc.json`

