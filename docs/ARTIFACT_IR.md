# Cadence — ArtifactIR (Intermediate Representation)
Version 1.0 | 2026-01-26

## Why IR exists
Cadence must compile deliverables (DOCX/PPTX/etc.) without manual formatting. V1 already commits to workflow-native output fileciteturn8file0L65-L65 and a DOCX generation pipeline fileciteturn8file0L107-L115.  
IR is the contract between the LLM and the compiler.

## IR design rules
- Minimal expressive set: headings, paragraphs, lists, tables, images, page breaks.
- Deterministic: no “style by vibes”; styles are tokens.
- Validatable: JSON Schema, strict enums.
- Extensible: additional blocks later (charts, callouts, citations).

## IR top-level
- `artifact`: metadata
- `blocks[]`: ordered content blocks
- `assets[]`: referenced images/files
- `styles`: optional overrides (prefer templates)

## Block types (MVP)
- `titlePage`
- `heading`
- `paragraph`
- `bullets`
- `numbered`
- `table`
- `pageBreak`

## Example (very small)
```json
{
  "artifact": {
    "id": "art_123",
    "type": "report",
    "title": "Cadence MVP Brief",
    "template": "consulting_report_v1"
  },
  "blocks": [
    { "type": "titlePage", "title": "Cadence MVP Brief", "subtitle": "Version 1" },
    { "type": "heading", "level": 1, "text": "Executive Summary" },
    { "type": "paragraph", "text": "Cadence is an IDE for deliverables..." },
    { "type": "table", "columns": ["Item","Value"], "rows": [["MVP","DOCX Export"]] }
  ]
}
```

## Compiler targets
- DOCX (MVP) via docx-js fileciteturn8file0L112-L114
- PPTX later via pptxgenjs fileciteturn8file0L115-L117
- PDF later via HTML → Playwright/Puppeteer fileciteturn8file0L118-L120

