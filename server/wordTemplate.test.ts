import { describe, expect, it } from "vitest";
import { DOCX_MIME_TYPE, buildWordTemplateStorageKey, validateDocxUpload } from "./wordTemplate";

describe("modelo Word", () => {
  const docxLikeBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);

  it("aceita um DOCX compactado com tamanho permitido", () => {
    expect(() => validateDocxUpload("modelo.docx", DOCX_MIME_TYPE, docxLikeBytes)).not.toThrow();
  });

  it("rejeita extensões, tipos e estruturas inválidas", () => {
    expect(() => validateDocxUpload("modelo.doc", DOCX_MIME_TYPE, docxLikeBytes)).toThrow("DOCX");
    expect(() => validateDocxUpload("modelo.docx", "text/plain", docxLikeBytes)).toThrow("DOCX");
    expect(() => validateDocxUpload("modelo.docx", DOCX_MIME_TYPE, Buffer.from("texto"))).toThrow("estrutura");
  });

  it("cria uma chave de armazenamento vinculada ao operador", () => {
    expect(buildWordTemplateStorageKey(12, "Modelo Compra e Venda.docx")).toMatch(/^contract-templates\/12\/\d+-Modelo-Compra-e-Venda\.docx$/);
  });
});
