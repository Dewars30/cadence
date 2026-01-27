import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  LevelFormat,
} from "docx";
import JSZip from "jszip";
import type { ArtifactIR, ArtifactBlock } from "../domain/artifactIR";

export type DocxCompileResult = {
  document: Document;
  bytes: Uint8Array;
};
const FIXED_DOCX_TIMESTAMP = "2000-01-01T00:00:00.000Z";
const FIXED_DOCX_DATE = new Date(FIXED_DOCX_TIMESTAMP);

function normalizeCoreXml(coreXml: string): string {
  const tags = ["dcterms:created", "dcterms:modified", "cp:lastPrinted"];
  return tags.reduce((xml, tag) => {
    const tagPattern = new RegExp(`<${tag}[^>]*>[^<]*</${tag}>`, "g");
    return xml.replace(tagPattern, (match) => {
      const openTag = match.match(new RegExp(`<${tag}[^>]*>`))?.[0] ?? `<${tag}>`;
      return `${openTag}${FIXED_DOCX_TIMESTAMP}</${tag}>`;
    });
  }, coreXml);
}

async function normalizeDocxBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  const coreXmlEntry = zip.file("docProps/core.xml");
  if (coreXmlEntry) {
    const coreXml = await coreXmlEntry.async("string");
    const normalizedCoreXml = normalizeCoreXml(coreXml);
    zip.file("docProps/core.xml", normalizedCoreXml);
  }

  Object.values(zip.files).forEach((file) => {
    file.date = FIXED_DOCX_DATE;
  });

  return zip.generateAsync({ type: "uint8array", date: FIXED_DOCX_DATE });
}

const numberingConfig = {
  config: [
    {
      reference: "cadence-numbering",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
        },
      ],
    },
  ],
};

function compileBlock(block: ArtifactBlock) {
  switch (block.type) {
    case "titlePage":
      return [
        new Paragraph({
          text: block.title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        ...(block.subtitle
          ? [
              new Paragraph({
                text: block.subtitle,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
            ]
          : []),
        new Paragraph({ children: [new PageBreak()] }),
      ];
    case "heading":
      return [
        new Paragraph({
          text: block.text,
          heading:
            block.level === 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
                ? HeadingLevel.HEADING_2
                : block.level === 3
                  ? HeadingLevel.HEADING_3
                  : HeadingLevel.HEADING_4,
        }),
      ];
    case "paragraph":
      return [new Paragraph({ text: block.text })];
    case "bullets":
      return block.items.map(
        (item) =>
          new Paragraph({
            text: item,
            bullet: { level: 0 },
          }),
      );
    case "numbered":
      return block.items.map(
        (item) =>
          new Paragraph({
            text: item,
            numbering: { reference: "cadence-numbering", level: 0 },
          }),
      );
    case "table": {
      const headerRow = new TableRow({
        children: block.columns.map(
          (col) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })],
            }),
        ),
      });
      const bodyRows = block.rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) => new TableCell({ children: [new Paragraph(cell)] })),
          }),
      );
      return [
        new Table({
          rows: [headerRow, ...bodyRows],
          width: { size: 100, type: "pct" },
        }),
      ];
    }
    case "pageBreak":
      return [new Paragraph({ children: [new PageBreak()] })];
    default:
      return [];
  }
}

export async function compileArtifactToDocx(ir: ArtifactIR): Promise<DocxCompileResult> {
  const children: Array<Paragraph | Table> = [];
  ir.blocks.forEach((block) => {
    const compiled = compileBlock(block);
    compiled.forEach((item) => children.push(item));
  });

  const document = new Document({
    numbering: numberingConfig,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: ir.artifact.title,
            heading: HeadingLevel.HEADING_1,
          }),
          new TableOfContents("Table of Contents", {
            hyperlink: true,
            headingStyleRange: "1-5",
          }),
          ...children,
        ],
      },
    ],
  });

  if (typeof Blob === "undefined") {
    const buffer = await Packer.toBuffer(document);
    const normalizedBytes = await normalizeDocxBytes(new Uint8Array(buffer));
    return { document, bytes: normalizedBytes };
  }
  const blob = await Packer.toBlob(document);
  const buffer = await blob.arrayBuffer();
  const normalizedBytes = await normalizeDocxBytes(new Uint8Array(buffer));
  return { document, bytes: normalizedBytes };
}
