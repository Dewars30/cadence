# Cadence — Warp/Codex Playbook (Repo-Aware)

This is the “how we keep crushing” loop.

## Daily loop (15–45 min)
1) `git status` + pull main
2) Pick **one** small PR target (see backlog below)
3) Implement with Codex in Agent Mode
4) Run:
   - `npm run lint`
   - `npm test`
   - `npx playwright install` (first time / CI parity)
   - `npm run test:e2e` (if UI/workflow/export changed)
5) Commit, push, open PR

## Repo-specific commands
- Dev: `npm run dev`
- Desktop: `npm run tauri dev`
- Unit: `npm test`
- E2E: `npm run test:e2e`
- Lint: `npm run lint`

## PR templates (copy/paste prompts)

### Prompt: Plan a PR (small + shippable)
You are in the Cadence repo. Read AGENTS.md and the relevant code.
Propose a PR plan limited to 3–7 commits:
- commit message
- files to change
- diff summary
- tests to run
- rollback note
Do not change unrelated code.

### Prompt: Implement a specific task
Implement: {{TASK}}.
Follow AGENTS.md. Keep diffs minimal.
After changes run: lint + unit tests.
If UI/workflow/export changed, run Playwright.
Summarize changes + why.

### Prompt: Fix failing tests
Here is failing output (attached). Diagnose root cause, apply minimal fix, and re-run failing tests.
Avoid refactors.

## Near-term backlog (the 5 PRs that matter)
PR1: GitHub Actions CI (lint + unit + Playwright)  
PR2: OpenAI provider (structured JSON schema outputs) behind `LLMProvider`  
PR3: IR patches for revisions (prevent full regen drift)  
PR4: Provenance export (`provenance.json` in project bundle)  
PR5: CanvasAdapter boundary (tldraw behind interface)

## Non-goals
No cloud sync. No PPTX/XLSX. No marketplace.
