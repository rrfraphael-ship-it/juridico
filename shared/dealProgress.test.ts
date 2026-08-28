import { describe, expect, it } from "vitest";
import { buildPendingActions, getContractProgress, getDiligenceProgress } from "./dealProgress";

describe("progresso e ações pendentes do negócio", () => {
  it("calcula os percentuais do contrato e da diligência", () => {
    expect(getContractProgress("revisao_cliente")).toBe(80);
    expect(getContractProgress()).toBe(0);
    expect(getDiligenceProgress([{ status: "aprovado" }, { status: "pendente" }])).toBe(50);
  });

  it("gera ações para intake e documentos ainda pendentes", () => {
    const actions = buildPendingActions({
      deals: [{ id: 1, title: "Imóvel A", stage: "intake" }, { id: 2, title: "Imóvel B", stage: "diligence" }],
      contracts: [],
      diligenceItems: [{ dealId: 2, attachedDocumentId: null, status: "pendente" }],
    });
    expect(actions.map(item => item.title)).toEqual(["Aguardando informações do intake", "Certidões pendentes"]);
  });
});
