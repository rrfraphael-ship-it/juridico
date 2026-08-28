import { describe, expect, it } from "vitest";
import { isSupportedCertificateMime, parseCertificateAnalysis } from "./certificateAnalysis";

describe("análise estruturada de certidões", () => {
  it("aceita PDFs e imagens para leitura assistida", () => {
    expect(isSupportedCertificateMime("application/pdf")).toBe(true);
    expect(isSupportedCertificateMime("image/png")).toBe(true);
    expect(isSupportedCertificateMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
  });

  it("valida a estrutura dos achados de risco", () => {
    const result = parseCertificateAnalysis(JSON.stringify({
      riskLevel: "moderado",
      summary: "Há informação que exige conferência documental.",
      findings: [{ title: "Prazo de validade", severity: "moderado", detail: "A data indicada precisa ser conferida.", recommendation: "Validar a emissão no órgão responsável." }],
      limitations: "Leitura assistida; exige revisão humana.",
    }));
    expect(result.riskLevel).toBe("moderado");
    expect(result.findings).toHaveLength(1);
  });
});
