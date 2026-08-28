import { PDFParse } from "pdf-parse";
import { extractDocxText, DOCX_MIME_TYPE, validateDocxUpload } from "./wordTemplate";

export const COPILOT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const COPILOT_MAX_TEXT_CHARS = 12_000;
export const COPILOT_ALLOWED_MIME_TYPES = [DOCX_MIME_TYPE, "application/pdf", "text/plain", "application/octet-stream"] as const;

export type CopilotAttachmentInput = { fileName: string; mimeType: string; bytes: Buffer };
export type ExtractedCopilotFile = { content: string; mimeType: string };

function normalizeFileName(fileName: string) {
  return fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function trimExtractedText(text: string) {
  const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return normalized.length > COPILOT_MAX_TEXT_CHARS ? `${normalized.slice(0, COPILOT_MAX_TEXT_CHARS)}\n\n[Conteúdo truncado para análise assistida.]` : normalized;
}

export function validateCopilotAttachment({ fileName, mimeType, bytes }: CopilotAttachmentInput) {
  const normalizedName = fileName.trim().toLowerCase();
  const normalizedMime = mimeType.trim().toLowerCase() || "application/octet-stream";
  const validName = normalizedName.endsWith(".docx") || normalizedName.endsWith(".pdf") || normalizedName.endsWith(".txt");
  const validMime = COPILOT_ALLOWED_MIME_TYPES.includes(normalizedMime as (typeof COPILOT_ALLOWED_MIME_TYPES)[number]);
  if (!fileName.trim() || !validName || !validMime) throw new Error("Anexe uma minuta em DOCX, PDF ou TXT.");
  if (!bytes.length || bytes.length > COPILOT_MAX_FILE_BYTES) throw new Error("Cada arquivo deve ter até 10 MB.");
  if (normalizedName.endsWith(".docx")) validateDocxUpload(fileName, normalizedMime, bytes);
  if (normalizedName.endsWith(".pdf") && bytes.subarray(0, 4).toString("utf8") !== "%PDF") throw new Error("O arquivo PDF selecionado não possui a estrutura esperada.");
  return { fileName: fileName.trim(), mimeType: normalizedMime, extension: normalizedName.split(".").pop() };
}

export async function extractCopilotAttachmentText(input: CopilotAttachmentInput): Promise<ExtractedCopilotFile> {
  const valid = validateCopilotAttachment(input);
  if (valid.extension === "docx") return { content: trimExtractedText(await extractDocxText(input.bytes)), mimeType: DOCX_MIME_TYPE };
  if (valid.extension === "txt") return { content: trimExtractedText(input.bytes.toString("utf8")), mimeType: "text/plain" };
  const parser = new PDFParse({ data: input.bytes });
  try {
    const result = await parser.getText();
    const content = trimExtractedText(result.text);
    if (!content) throw new Error("Não foi possível extrair texto deste PDF. Envie uma versão pesquisável ou revise o documento manualmente.");
    return { content, mimeType: "application/pdf" };
  } finally {
    await parser.destroy();
  }
}

export function buildCopilotAttachmentStorageKey(ownerId: number, sessionId: string, fileName: string) {
  return `copilot-attachments/${ownerId}/${sessionId}/${Date.now()}-${normalizeFileName(fileName)}`;
}

export function buildAttachmentContext(files: Array<{ name: string; extractedText: string }>) {
  if (!files.length) return "Nenhum arquivo foi anexado a esta conversa.";
  return files.map((file, index) => `## Anexo ${index + 1}: ${file.name}\n${file.extractedText}`).join("\n\n");
}

export function assertDistinctCopilotFiles(firstAttachmentId: number, secondAttachmentId: number) {
  if (!Number.isInteger(firstAttachmentId) || !Number.isInteger(secondAttachmentId) || firstAttachmentId <= 0 || secondAttachmentId <= 0) throw new Error("Selecione duas minutas válidas para comparar.");
  if (firstAttachmentId === secondAttachmentId) throw new Error("Selecione duas minutas diferentes para comparar.");
}

export function selectMinutasForComparison<T extends { id: number }>(files: T[], firstAttachmentId: number, secondAttachmentId: number) {
  assertDistinctCopilotFiles(firstAttachmentId, secondAttachmentId);
  const first = files.find(file => file.id === firstAttachmentId);
  const second = files.find(file => file.id === secondAttachmentId);
  if (!first || !second) throw new Error("As duas minutas precisam pertencer a esta conversa.");
  return { first, second };
}

export function buildMinutaComparisonPrompt(first: { name: string; extractedText: string }, second: { name: string; extractedText: string }) {
  return `Compare as duas minutas abaixo exclusivamente a partir do conteúdo fornecido. Organize a resposta em: **Resumo executivo**, **Alterações materiais**, **Alterações de partes, objeto, preço, prazo, garantias, obrigações, penalidades, foro e assinatura**, **Trechos que merecem revisão** e **Limitações da comparação**. Para cada diferença, indique se ela é textual, operacional ou potencialmente jurídica, sem concluir validade ou invalidade. Não invente cláusulas, datas ou efeitos jurídicos. A comparação é apoio à revisão humana por profissional responsável.\n\n## MINUTA A — ${first.name}\n${first.extractedText}\n\n## MINUTA B — ${second.name}\n${second.extractedText}`;
}
