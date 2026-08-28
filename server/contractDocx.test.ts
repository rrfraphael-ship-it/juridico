import { describe, expect, it } from "vitest";
import { buildContractDocx, buildContractDocxName } from "./contractDocx";

describe("exportação DOCX", () => {
  it("cria um nome de arquivo seguro", () => {
    expect(buildContractDocxName("Minuta — Rua das Flores")).toBe("Minuta-Rua-das-Flores.docx");
  });

  it("gera bytes de documento a partir da minuta", async () => {
    const bytes = await buildContractDocx("Minuta", [], "CLÁUSULA PRIMEIRA\nConteúdo da minuta.");
    expect(bytes.byteLength).toBeGreaterThan(100);
  });
});
