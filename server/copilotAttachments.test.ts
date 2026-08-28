import { describe, expect, it } from "vitest";
import { COPILOT_MAX_FILE_BYTES, assertDistinctCopilotFiles, buildAttachmentContext, buildMinutaComparisonPrompt, extractCopilotAttachmentText, selectMinutasForComparison, validateCopilotAttachment } from "./copilotAttachments";

describe("anexos do Copiloto Jurídico", () => {
  it("aceita texto simples e rejeita formatos ou tamanhos incompatíveis", () => {
    expect(validateCopilotAttachment({ fileName: "minuta-a.txt", mimeType: "text/plain", bytes: Buffer.from("Cláusula primeira") }).mimeType).toBe("text/plain");
    expect(() => validateCopilotAttachment({ fileName: "minuta.doc", mimeType: "application/msword", bytes: Buffer.from("conteúdo") })).toThrow("DOCX, PDF ou TXT");
    expect(() => validateCopilotAttachment({ fileName: "minuta.txt", mimeType: "text/plain", bytes: Buffer.alloc(COPILOT_MAX_FILE_BYTES + 1) })).toThrow("até 10 MB");
  });

  it("mantém nomes e conteúdo dos anexos como contexto explícito", () => {
    expect(buildAttachmentContext([{ name: "minuta.docx", extractedText: "Cláusula 1" }])).toContain("Anexo 1: minuta.docx");
  });

  it("extrai conteúdo de um anexo TXT e reporta PDF inválido antes de armazenar", async () => {
    await expect(extractCopilotAttachmentText({ fileName: "minuta.txt", mimeType: "text/plain", bytes: Buffer.from("Cláusula sobre preço") })).resolves.toMatchObject({ content: "Cláusula sobre preço", mimeType: "text/plain" });
    await expect(extractCopilotAttachmentText({ fileName: "minuta.pdf", mimeType: "application/pdf", bytes: Buffer.from("arquivo inválido") })).rejects.toThrow("estrutura esperada");
  });

  it("instrui o comparador a destacar diferenças sem substituir a revisão humana", () => {
    const prompt = buildMinutaComparisonPrompt({ name: "versão A.docx", extractedText: "Preço: R$ 100" }, { name: "versão B.docx", extractedText: "Preço: R$ 120" });
    expect(prompt).toContain("MINUTA A — versão A.docx");
    expect(prompt).toContain("MINUTA B — versão B.docx");
    expect(prompt).toContain("revisão humana");
  });

  it("exige duas minutas distintas e identificadores válidos", () => {
    expect(() => assertDistinctCopilotFiles(4, 4)).toThrow("duas minutas diferentes");
    expect(() => assertDistinctCopilotFiles(0, 2)).toThrow("minutas válidas");
    expect(() => assertDistinctCopilotFiles(4, 7)).not.toThrow();
  });

  it("seleciona duas minutas da conversa e rejeita arquivo ausente", () => {
    const files = [{ id: 4, name: "a.docx", extractedText: "A" }, { id: 7, name: "b.docx", extractedText: "B" }];
    expect(selectMinutasForComparison(files, 4, 7)).toMatchObject({ first: { name: "a.docx" }, second: { name: "b.docx" } });
    expect(() => selectMinutasForComparison(files, 4, 9)).toThrow("precisam pertencer");
  });
});
