# Cadence — PRD (V2)
Version 2.0 | 2026-01-26

## 1. Goals
- Eliminate export/reformat friction by compiling structured artifacts into DOCX (MVP) fileciteturn8file0L23-L24.
- Preserve project context spatially on a canvas fileciteturn8file0L62-L65.
- Enforce a deterministic workflow with checkpoints and final locking fileciteturn8file0L95-L106 fileciteturn8file0L126-L133.
- Make outputs reproducible via ArtifactIR + Runs (V2 addition).

## 2. Non-goals (MVP)
- No multi-user collaboration (Phase 3+) fileciteturn8file0L278-L283.
- No mandatory cloud sync; local-first only fileciteturn8file0L134-L138.
- No plugin marketplace.

## 3. Personas
- Solo consultant/strategist (weekly deliverables)
- Founder/PM (PRDs, memos, decks)
- Agency lead (client briefs, pitch narratives)

## 4. User Stories (MVP)
### Project setup
- As a user, I can create a Workspace and Project.
- As a user, I can set a Project Readme (AI context / rules).

### Canvas
- As a user, I can create and move nodes: Chat, Artifact, Scratchpad.
- As a user, I can open an inspector for any node.

### AI run
- As a user, I can start a Run from a prompt.
- As a user, I can see the current phase and what it produced.
- As a user, I can approve a phase to continue.

### Versioning
- As a user, I can checkpoint an Artifact as V1/V2 with a note.
- As a user, I can lock a version as Final (immutable).

### Export
- As a user, I can export an Artifact version to DOCX.
- As a user, I can choose a style template.

## 5. Requirements (MVP)
### Functional
- Workflow state machine with 5 phases fileciteturn8file0L95-L106
- ArtifactIR schema validation
- DOCX compilation using docx-js fileciteturn8file0L112-L114
- Local persistence in SQLite fileciteturn8file0L271-L273
- Basic style templates fileciteturn8file0L274-L275

### Non-functional
- Works fully offline (except AI calls)
- Fast startup; responsive canvas with ~200 nodes
- Deterministic exports (same IR + template => same DOCX)

## 6. Success Metrics (MVP)
- Time-to-first-export < 10 minutes for a standard report (internal target).
- Export success rate > 95% on golden fixtures.
- 5 design partners can ship a real client deliverable end-to-end.

## 7. Open Questions
- Should “Chat Mode” exist in MVP or only Workshop/Production? fileciteturn8file0L218-L221
- What’s the minimum acceptable DOCX feature set (TOC? headers? footers?) 
