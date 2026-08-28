import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fichas documentais da diligência", () => {
  it("oferece emissão, anexo e visualização por ficha, além de anexos complementares", () => {
    const source = readFileSync(new URL("../client/src/components/DiligenceDocumentWorkspace.tsx", import.meta.url), "utf8");
    expect(source).toContain("Emitir certidão");
    expect(source).toContain("Anexar certidão");
    expect(source).toContain("Visualizar certidão");
    expect(source).toContain("Selecione a UF da diligência");
    expect(source).toContain("Documentos das partes, município e condomínio");
    expect(source).toContain("attachSupporting");
  });
});
