import mammoth from "mammoth";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export function validateDocxUpload(fileName: string, mimeType: string, bytes: Buffer) {
  const normalizedName = fileName.trim().toLowerCase();
  const allowedMime = mimeType === DOCX_MIME_TYPE || mimeType === "application/octet-stream";
  const looksLikeZip = bytes.length >= 4 && bytes.subarray(0, 2).toString("utf8") === "PK";
  if (!normalizedName.endsWith(".docx")) throw new Error("Envie um arquivo Word no formato DOCX.");
  if (!allowedMime) throw new Error("O arquivo precisa ser um documento Word DOCX.");
  if (!bytes.length || bytes.length > MAX_DOCX_BYTES) throw new Error("Envie um arquivo DOCX de até 10 MB.");
  if (!looksLikeZip) throw new Error("O arquivo selecionado não possui a estrutura esperada de um DOCX.");
}

export async function extractDocxText(bytes: Buffer) {
  const result = await mammoth.extractRawText({ buffer: bytes });
  return result.value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildWordTemplateStorageKey(ownerId: number, fileName: string) {
  const safeName = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return `contract-templates/${ownerId}/${Date.now()}-${safeName}`;
}
