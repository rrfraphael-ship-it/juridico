import { describe, expect, it } from "vitest";
import { buildProposalDealDraft, canConvertProposal } from "./proposalsDomain";

describe("Central de Propostas", () => {
  it("só permite converter uma proposta aceita sem negócio vinculado", () => {
    expect(canConvertProposal("aceita", null)).toBe(true);
    expect(canConvertProposal("enviada", null)).toBe(false);
    expect(canConvertProposal("aceita", 22)).toBe(false);
  });

  it("transfere condições comerciais e partes futuras para o rascunho de Dados do negócio", () => {
    const draft = buildProposalDealDraft({ transactionType: "venda", propertyAddress: "Rua das Acácias, 120, Curitiba/PR", offerAmount: 780000, paymentMethod: "Financiamento", paymentFlow: "Sinal e saldo financiado", conditions: "Sujeito à análise documental", futureParties: [{ role: "vendedor", name: "Vendedora exemplo" }, { role: "comprador", name: "Comprador exemplo" }, { role: "corretor", name: "Corretor exemplo", commissionAmount: 12000 }] });
    expect(draft).toMatchObject({ transactionType: "venda", propertyAddress: "Rua das Acácias, 120, Curitiba/PR", price: 780000, paymentMethod: "Financiamento", paymentSchedule: "Sinal e saldo financiado", sellers: [{ name: "Vendedora exemplo" }], buyers: [{ name: "Comprador exemplo" }], partners: [{ name: "Corretor exemplo", commissionAmount: 12000 }] });
  });

  it("mapeia valor e condições comerciais de locação sem antecipar os campos obrigatórios restantes", () => {
    const draft = buildProposalDealDraft({ transactionType: "locacao", propertyAddress: "Avenida Central, 50, Belo Horizonte/MG", offerAmount: 4200, paymentMethod: "Boleto", paymentFlow: "Pagamento mensal", conditions: "Garantia será definida", futureParties: [] });
    expect(draft).toMatchObject({ transactionType: "locacao", rentAmount: 4200, paymentSchedule: "Pagamento mensal", specialConditions: "Garantia será definida" });
  });
});
