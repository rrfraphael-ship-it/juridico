import { describe, expect, it } from "vitest";

const stages = ["intake", "diligence", "draft", "internal_review", "client_review", "signed", "archived"] as const;

function isOperationalStage(stage: (typeof stages)[number]) {
  return stage !== "archived";
}

function dossierProgress(items: Array<{ status: "pendente" | "em_revisao" | "aprovado" | "dispensado" }>) {
  if (items.length === 0) return 0;
  return Math.round((items.filter(item => item.status === "aprovado" || item.status === "dispensado").length / items.length) * 100);
}

describe("regras de domínio jurídico-imobiliário", () => {
  it("não considera um processo arquivado como negócio ativo", () => {
    expect(stages.filter(isOperationalStage)).not.toContain("archived");
    expect(isOperationalStage("draft")).toBe(true);
  });

  it("calcula a prontidão da diligência com base em itens aprovados ou dispensados", () => {
    expect(dossierProgress([{ status: "aprovado" }, { status: "em_revisao" }, { status: "dispensado" }])).toBe(67);
    expect(dossierProgress([])).toBe(0);
  });
});

