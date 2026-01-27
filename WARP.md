# Warp Notes (Cadence)

This repo is optimized for Warp Agent Mode (Codex 5.2 high).

## Use in Warp
- Run Warp `/init` in this repo to register rules and index context.
- Keep a “Safe” agent profile that requires approval for:
  - file writes outside `src/`, `tests/`, `docs/`, `.github/`
  - destructive commands (`rm`, `git push -f`, `npm publish`, etc.)

## Universal Input shortcuts
- `*` force Agent Mode
- `!` force Terminal Mode

## What to attach as context (always)
- failing test output blocks
- `git diff` blocks
- screenshots/logs for Playwright failures

## Preferred PR rhythm
- 1 feature PR + 1 quality PR per week.
- Always keep Playwright hero loop green.
