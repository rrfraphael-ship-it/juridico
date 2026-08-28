import { buildCopilotAttachmentStorageKey, extractCopilotAttachmentText } from "./copilotAttachments";

export type CopilotAttachmentRecord = { ownerId: number; sessionId: string; name: string; mimeType: string; byteSize: number; storageKey: string; storageUrl: string; extractedText: string };
export type CopilotAttachmentUpload = { ownerId: number; sessionId: string; fileName: string; mimeType: string; bytes: Buffer };
export type CopilotAttachmentStorage = { put: (key: string, bytes: Buffer, mimeType: string) => Promise<{ key: string; url: string }>; create: (record: CopilotAttachmentRecord) => Promise<number> };

export async function persistCopilotAttachment(input: CopilotAttachmentUpload, storage: CopilotAttachmentStorage) {
  const extracted = await extractCopilotAttachmentText({ fileName: input.fileName, mimeType: input.mimeType, bytes: input.bytes });
  const stored = await storage.put(buildCopilotAttachmentStorageKey(input.ownerId, input.sessionId, input.fileName), input.bytes, extracted.mimeType);
  const id = await storage.create({ ownerId: input.ownerId, sessionId: input.sessionId, name: input.fileName.trim(), mimeType: extracted.mimeType, byteSize: input.bytes.length, storageKey: stored.key, storageUrl: stored.url, extractedText: extracted.content });
  return { id, name: input.fileName.trim(), mimeType: extracted.mimeType, byteSize: input.bytes.length };
}
