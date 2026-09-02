import { describe, expect, it } from "vitest";
import { buildContractPdf, buildContractPdfName } from "./contractPdf";

describe("exportação de contrato em PDF", () => {
  it("gera um PDF a partir dos tópicos consolidados", async () => {
    const pdf = await buildContractPdf("Minuta de compra e venda", [{ id: "partes", title: "Partes", content: "Vendedor e comprador qualificados.", baseContent: "", businessContext: "", status: "preenchido", sources: [] }], "");
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(buildContractPdfName("Minuta de compra e venda")).toBe("Minuta-de-compra-e-venda.pdf");
  });
});
