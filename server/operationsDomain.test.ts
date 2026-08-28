import { describe, expect, it } from "vitest";
import { buildOperationWorkItems, calculateContractCompleteness, canApproveException, getSlaStatus, isDossierCategory, kitAppliesToDeal, requiredApprovalLevel } from "./operationsDomain";

describe("esteira jurídico-operacional", () => {
  it("cria marcos com bloqueios coerentes à maturidade do processo", () => {
    const items = buildOperationWorkItems({ ownerId: 1, dealId: 2, hasSubmittedIntake: true, diligenceComplete: false, hasContract: false, clientReviewApproved: false });
    expect(items).toHaveLength(6);
    expect(items[0]).toMatchObject({ milestone: "intake", status: "concluido" });
    expect(items[1]).toMatchObject({ milestone: "diligencia", status: "pendente", blocking: true });
  });

  it("bloqueia o compartilhamento quando há tópico pendente ou exceção de alto risco", () => {
    const result = calculateContractCompleteness([
      { id: "partes", title: "Partes", content: "Dados", status: "preenchido", sources: ["Intake"] },
      { id: "preco", title: "Preço", content: "", status: "pendente", sources: [] },
    ] as never, [{ topicId: "partes", status: "aberta", riskLevel: "alto" }]);
    expect(result.blocked).toBe(2);
    expect(result.canShare).toBe(false);
  });

  it("classifica SLA, aplicabilidade de kit e categorias controladas do dossiê", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    expect(getSlaStatus(new Date("2026-08-24T12:00:00Z"), now)).toBe("vencido");
    expect(getSlaStatus(new Date("2026-08-26T10:00:00Z"), now)).toBe("proximo");
    expect(kitAppliesToDeal("venda", "venda")).toBe(true);
    expect(kitAppliesToDeal("locacao", "venda")).toBe(false);
    expect(["partes", "imovel", "certidoes", "municipal", "condominio", "contrato", "financeiro", "fechamento", "outro"].every(isDossierCategory)).toBe(true);
    expect(isDossierCategory("desconhecido")).toBe(false);
  });

  it("impõe alçada proporcional ao risco da exceção", () => {
    expect(requiredApprovalLevel("alto")).toBe("diretoria");
    expect(canApproveException("juridico", "operacional")).toBe(false);
    expect(canApproveException("juridico", "diretoria")).toBe(true);
  });
});
