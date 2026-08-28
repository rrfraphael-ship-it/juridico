import PDFDocument from "pdfkit";
import type { GuidedTopic } from "./contractTopics";

export async function buildContractPdf(title: string, topics: GuidedTopic[], fallbackContent: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 54, info: { Title: title, Author: "ImobLegal" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.font("Helvetica-Bold").fontSize(17).fillColor("#18181b").text(title, { align: "center" });
    document.moveDown(1.25);
    if (topics.length) {
      topics.forEach((topic, index) => {
        document.font("Helvetica-Bold").fontSize(12).fillColor("#27272a").text(`${index + 1}. ${topic.title.toUpperCase()}`, { paragraphGap: 7 });
        document.font("Helvetica").fontSize(10.5).fillColor("#27272a").text(topic.content.trim() || "[Pendente de preenchimento]", { lineGap: 3, paragraphGap: 15, align: "justify" });
      });
    } else {
      document.font("Helvetica").fontSize(10.5).fillColor("#27272a").text(fallbackContent.trim() || "[Pendente de preenchimento]", { lineGap: 3, align: "justify" });
    }
    document.fontSize(8).fillColor("#71717a").text("Documento gerado pelo ImobLegal. A revisão jurídica humana permanece indispensável.", 54, 786, { align: "center", width: 487 });
    document.end();
  });
}

export function buildContractPdfName(title: string) {
  const name = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${name || "minuta-contratual"}.pdf`;
}
