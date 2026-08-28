import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { GuidedTopic } from "./contractTopics";

export async function buildContractDocx(title: string, topics: GuidedTopic[], fallbackContent: string) {
  const children = topics.length ? topics.flatMap(topic => [
    new Paragraph({ text: topic.title, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
    ...topic.content.split("\n").map(line => new Paragraph({ children: [new TextRun(line || " ")] })),
  ]) : fallbackContent.split("\n").map(line => new Paragraph({ children: [new TextRun(line || " ")] }));
  const document = new Document({ sections: [{ properties: {}, children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), ...children] }] });
  return Packer.toBuffer(document);
}

export function buildContractDocxName(title: string) {
  const name = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${name || "minuta-contratual"}.docx`;
}
