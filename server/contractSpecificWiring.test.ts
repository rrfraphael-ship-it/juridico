import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contrato específico no negócio", () => {
  it("exige um modelo ativo e compatível antes de criar uma minuta guiada", () => {
    const source = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("templateId: z.number().int()");
    expect(source).toContain("eq(contractTemplates.id, input.templateId)");
    expect(source).toContain("template.transactionType !== detail.deal.transactionType");
    expect(source).toContain("contractType: template.contractType");
  });

  it("isola a consulta guiada pelo contrato selecionado e permite iniciar nova minuta", () => {
    const composer = readFileSync(new URL("../client/src/components/GuidedContractComposer.tsx", import.meta.url), "utf8");
    expect(composer).toContain("contractId: activeContract?.id ?? null");
    expect(composer).toContain("Criar nova minuta para este negócio");
    expect(composer).toContain("Tipo e modelo padrão da nova minuta");
    expect(composer).toContain("A edição, a IA e a exportação atuam somente no contrato selecionado.");
  });
});
