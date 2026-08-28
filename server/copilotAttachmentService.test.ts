import { describe, expect, it, vi } from "vitest";
import { persistCopilotAttachment } from "./copilotAttachmentService";

describe("persistência de anexo do Copiloto", () => {
  it("armazena o arquivo extraído e devolve os metadados esperados pela mutation", async () => {
    const put = vi.fn().mockResolvedValue({ key: "copilot-attachments/12/sessao/minuta.txt", url: "/manus-storage/copilot-attachments/minuta.txt" });
    const create = vi.fn().mockResolvedValue(91);
    const result = await persistCopilotAttachment({ ownerId: 12, sessionId: "sessao-segura", fileName: "minuta.txt", mimeType: "text/plain", bytes: Buffer.from("Cláusula sobre pagamento") }, { put, create });
    expect(put).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 12, sessionId: "sessao-segura", name: "minuta.txt", extractedText: "Cláusula sobre pagamento" }));
    expect(result).toEqual({ id: 91, name: "minuta.txt", mimeType: "text/plain", byteSize: 25 });
  });

  it("interrompe o upload inválido antes de gravar no armazenamento ou banco", async () => {
    const put = vi.fn();
    const create = vi.fn();
    await expect(persistCopilotAttachment({ ownerId: 12, sessionId: "sessao-segura", fileName: "minuta.doc", mimeType: "application/msword", bytes: Buffer.from("conteúdo") }, { put, create })).rejects.toThrow("DOCX, PDF ou TXT");
    expect(put).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
