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
import type { ArtifactIR, ArtifactBlock } from "../domain/artifactIR";

export type DocxCompileResult = {
  document: Document;
  bytes: Uint8Array;
};

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
    return { document, bytes: new Uint8Array(buffer) };
  }
  const blob = await Packer.toBlob(document);
  const buffer = await blob.arrayBuffer();
  return { document, bytes: new Uint8Array(buffer) };
}
