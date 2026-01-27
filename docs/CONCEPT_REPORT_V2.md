# Cadence — Concept Development Report (V2)
*AI‑Native Concept Development IDE*  
Version 2.0 | 2026-01-26

> Baseline: V1 framed Cadence as a **local‑first, AI‑native concept development environment** that bridges ideation and **professional document delivery** — eliminating the copy‑paste/export/reformat cycle fileciteturn8file0L20-L24.

---

## 0) Executive Snapshot

### The product
Cadence is an **IDE for intellectual work**: briefs, PRDs, business cases, pitch decks, research syntheses, strategy memos. It combines:
- **Spatial persistence** (canvas) so work isn’t buried in chat history fileciteturn8file0L62-L65
- **Prescribed workflow engine** (state machine) so “thinking” becomes a repeatable build process fileciteturn8file0L95-L106
- **Workflow‑native output** (DOCX/PPTX/PDF/XLSX) so deliverables ship like real artifacts fileciteturn8file0L107-L123
- **Document‑grade versioning** (draft/checkpoint/final) fileciteturn8file0L126-L133
- **Local‑first storage** (SQLite; optional sync later) fileciteturn8file0L134-L138

### The wedge
MVP proves a single “hero loop”: **Start from a prompt → build a versioned consulting‑grade report → export a styled Word doc** fileciteturn8file0L263-L275.

### The differentiator (what V2 adds)
V2 turns Cadence from “nice workflow app” into a **deterministic build system for deliverables**:

1. **Artifact IR (Intermediate Representation) + Compiler**
   - LLM outputs a structured IR (JSON/YAML) rather than raw prose.
   - Compiler renders IR into DOCX/PPTX/XLSX/PDF via adapters.
   - This is the *anti‑hallucination layer* for formatting.

2. **Workflow Runs**
   - Every output is the result of a logged “run” (inputs → prompts → IR → exports).
   - Enables reproducibility, diffs, rollbacks, and future “team mode”.

3. **Style Tokens + Templates**
   - Style is not “after the fact.” It’s part of the build contract fileciteturn8file0L124-L125.
   - Cadence ships with template packs (consulting report, pitch deck, PRD, memo).

### Success definition
A user can produce a polished client deliverable with:
- **zero copy/paste**
- **clear versions (V1/V2/Final)**
- **exportable to Word** (and optionally PDF)
- **future‑proof** (project bundle can be re‑opened and rebuilt)

---

## 1) The Problem (why this exists)

V1 diagnosed the “workflow fragmentation crisis” — context loss, export friction, scattered versions, and round‑trip penalties fileciteturn8file0L46-L55.

V2 reframes that problem as a build failure:

- AI chat is *not a build system*. It doesn’t produce reproducible artifacts.
- Knowledge work has no “compiler.” Humans do the compilation manually (formatting, structuring, styling).
- Without **state + IR + versioning**, you can’t scale quality or collaboration.

**Cadence’s bet:** Knowledge work will converge on developer‑like primitives:  
projects, artifacts, versions, builds, templates, compile targets.

---

## 2) Who it’s for

Primary wedge users (prosumer):
- Solo consultants, strategists, researchers, founders shipping deliverables weekly.

Secondary:
- Creative/brand agencies: briefs, decks, client narratives.

Enterprise (later):
- Strategy & product teams needing compliance + governance.

(V1 already scoped target segments and pricing bands; keep as hypothesis until design‑partner validation.) fileciteturn8file0L311-L335

---

## 3) Core UX: the “Hero Loop”

### Hero loop (MVP)
1. Create Project
2. Start a “Run” from a prompt (or imported notes)
3. Cadence executes phases:
   - Understanding → Requirements → Scaffolding → Production → Finalization fileciteturn8file0L95-L106
4. Each phase produces artifacts on the canvas:
   - Understanding Summary
   - Outline/Scaffold
   - Draft v0
   - Checkpoint V1
   - Checkpoint V2
   - Final (locked)
5. Export Word (DOCX) with style template applied fileciteturn8file0L107-L125

### Why a canvas (not a document list)
Spatial persistence is the user’s “working memory”: conversation threads, drafts, research, constraints, and exports exist **side‑by‑side** fileciteturn8file0L62-L65.

---

## 4) Product Primitives (the mental model)

Cadence should feel like an IDE, not a note app.

### Entities (extended from V1)
V1 core entities: Workspace, Project, Artifact, Version, Conversation, Message, StyleTemplate fileciteturn8file0L180-L210.  
V2 adds:

- **Run**: execution of the workflow state machine.
- **PromptUnit**: templated system+developer+user prompt pieces.
- **ArtifactIR**: structured representation of a deliverable.
- **Build**: compilation result(s) of an ArtifactIR into output files.
- **CanvasNode/Edge**: spatial graph linking all of the above.

### Artifact lifecycle (document‑grade)
Draft → Checkpoint (V1/V2/…) → Final (locked) fileciteturn8file0L126-L133  
Also: “Branch” (explore alternative direction) — optional for MVP.

---

## 5) The Cadence Workflow Engine (state machine)

V1 already defined a deterministic workflow (5 phases) fileciteturn8file0L95-L106.  
V2 tightens it into explicit state contracts:

Each phase must output:
- **Text summary** (human readable)
- **IR deltas** (machine readable)
- **Acceptance checklist** for that phase

### State machine contract
- Phase transitions require “exit criteria”
- AI cannot jump to Finalization without a Scaffold artifact
- Every phase generates a “Phase Report” artifact node

---

## 6) The Artifact Compiler (the V2 superpower)

### Why you need IR
If the AI outputs raw markdown, formatting becomes guesswork.  
If the AI outputs **ArtifactIR**, formatting becomes compilation.

### Pipeline
1. **Generation**: LLM produces ArtifactIR (validated via JSON Schema)
2. **Normalization**: deterministically clean/repair IR
3. **Compilation**: IR → target adapter:
   - DOCX (docx-js)
   - PPTX (pptxgenjs)
   - XLSX (exceljs)
   - PDF (HTML → Playwright/Puppeteer) fileciteturn8file0L107-L123
4. **Preview**: renderers for in‑app preview (HTML preview for Word-like, slide preview)
5. **Export**: write to filesystem via Tauri

### Template + token system
- StyleTemplate defines typographic tokens (fonts, sizes, spacing, heading styles)
- Template packs map IR blocks to those tokens
- Users can import a template from an existing DOCX/PPTX later (Phase 2)

---

## 7) Technical Architecture (buildable)

V1’s recommended stack is solid: Tauri 2 + React + tldraw + SQLite + doc gen libs fileciteturn8file0L69-L83.  
V2 adds clearer module boundaries to keep Codex from building a blob.

### Modules
1. **UI Shell**
   - Tauri commands: filesystem, DB, export, keychain, logging

2. **Canvas**
   - tldraw custom shapes: ChatNode, ArtifactNode, ScratchpadNode fileciteturn8file0L87-L94
   - Node inspector panel (metadata, versions, exports)

3. **Project + Versioning**
   - Workspace DB, project readme/context, version timeline
   - Content snapshots stored in SQLite

4. **AI Orchestrator**
   - Provider adapter (OpenAI / Anthropic / local later)
   - State machine runner
   - Context builder (selective retrieval from artifacts + summaries)

5. **Compiler**
   - IR schemas
   - Target adapters (docx/pptx/xlsx/pdf)
   - Deterministic preview and export

6. **Telemetry (local-first)**
   - Runs, token spend, time-to-export
   - All stored locally; optional opt-in analytics later

---

## 8) Data model (SQLite)

V1’s outline is a strong base fileciteturn8file0L180-L213.  
V2 makes it more explicit for implementation and future sync.

**Guiding rule:** all core IDs are UUID TEXT for eventual CRDT sync fileciteturn8file0L211-L213.

(Full schema provided in `schema/sqlite.sql` in this build pack.)

---

## 9) MVP scope (ruthless)

Keep V1 MVP: canvas + workflow + Word export + local SQLite fileciteturn8file0L263-L275.

### Included
- Single workspace
- Projects
- Canvas nodes (Chat, Artifact, Scratchpad)
- Workflow Run: the 5 phases
- Artifact versioning (draft + checkpoints + final lock)
- DOCX export with basic templates
- Local storage

### Excluded (Phase 2+)
- Sync/CRDT
- Multi-user collaboration
- Plugin marketplace
- PPTX/XLSX exports (unless “one more target” is needed for marketing)
- Advanced diff visualization

V1 already lists these exclusions fileciteturn8file0L276-L283.

---

## 10) Product risks (the real ones)

V1 highlighted formatting edge cases as the major risk fileciteturn8file0L372-L376.  
V2 mitigation: **IR + templates + golden fixtures**.

Top risks:
1. **DOCX fidelity**: tables, TOC, headers/footers
2. **Preview parity**: in-app preview ≠ exported result
3. **Scope creep**: “just add PPTX” spirals
4. **LLM drift**: output shape breaks compilation

Mitigation patterns:
- Schema validation + auto-repair + strict compiler errors
- Golden output fixtures with snapshot tests
- “Template-first” generation (LLM fills slots)

---

## 11) Moat (don’t hand-wave this)

“Local-first + canvas + AI” is not a moat. It’s a feature set.

Cadence moats (buildable):
1. **ArtifactIR format + compiler adapters** (a protocol)
2. **Template library** (battle-tested deliverable templates)
3. **Run logs + reproducibility** (audit trail for work)
4. **Workflow patterns** (state machines tuned for deliverable quality)
5. **User project bundles** (portable “Cadence Project” files that can be shared)

---

## 12) Roadmap (high signal)

### Phase 1 — MVP (macOS)
- Hero loop complete
- DOCX export + template packs
- Project bundles export/import
- “Runs” + versioning

### Phase 2 — Expansion
- PPTX export
- Template import from DOCX/PPTX
- Windows/Linux
- Better previews + diff

### Phase 3 — Team mode
- Sync (CRDT)
- Shared template libraries
- Access control + SSO (enterprise)

(Aligned with V1’s phased roadmap fileciteturn8file0L429-L445.)

---

## 13) What Codex needs (build contract)

Codex will succeed if you give it:
- clear module boundaries
- schemas
- acceptance tests
- a minimal UI spec
- “no scope creep” guardrails

This build pack includes:
- SQLite schema
- IR schemas
- API contracts (Tauri commands + TS interfaces)
- End-to-end acceptance criteria (Gherkin)
- Task breakdown

---

## Appendix: Fast acceptance test (MVP)

**Scenario: Build a consulting report**
- Given a new project
- When I start a run with a prompt
- Then Cadence produces artifacts for each phase
- And I can checkpoint V1 and V2
- And I can lock Final
- And I can export DOCX
- And the exported DOCX contains:
  - Title page
  - Table of contents
  - 3+ sections with headings
  - 1 table
  - 1 bulleted list
  - page numbers and header/footer (basic)

