import { describe, expect, it } from "vitest";
import { buildGuidedTopics, composeGuidedContract, hydrateGuidedTopics, validateGuidedTopics } from "./contractTopics";

describe("tópicos jurídicos guiados", () => {
  const topics = buildGuidedTopics({
    deal: { title: "Apartamento", propertyAddress: "Rua das Acácias, 10", transactionType: "venda", estimatedValue: 500000, deadline: new Date("2026-10-10") },
    intakes: [{ contactName: "Operador", contactEmail: "operador@exemplo.com", contactPhone: "11900000000", payload: { notes: "Posse após a quitação." } }],
    parties: [{ role: "comprador", fullName: "Pessoa Compradora", documentNumber: null, email: null, phone: null }],
    checklist: [{ title: "Matrícula atualizada", status: "aprovado", attachedDocumentId: 1 }],
    analyses: [],
  });

  it("preenche os tópicos com intake, negócio e diligência", () => {
    expect(topics.find(topic => topic.id === "objeto")?.content).toContain("Rua das Acácias, 10");
    expect(topics.find(topic => topic.id === "titulo")?.content).toContain("Matrícula atualizada");
    expect(topics.find(topic => topic.id === "partes")?.status).toBe("preenchido");
  });

  it("consolida e valida a estrutura da minuta", () => {
    validateGuidedTopics(topics);
    expect(composeGuidedContract(topics)).toContain("PARTES");
    expect(() => validateGuidedTopics(topics.slice(1))).toThrow("todos os tópicos");
  });

  it("consolida parceiros e suas comissões no tópico correspondente", () => {
    const withPartner = buildGuidedTopics({
      deal: { title: "Apartamento", propertyAddress: "Rua das Acácias, 10", transactionType: "venda", estimatedValue: 500000, deadline: null },
      intakes: [],
      parties: [{ role: "parceiro", fullName: "Imobiliária Parceira", documentNumber: "12.345.678/0001-90", email: null, phone: null, commissionAmount: 15000 }],
      checklist: [],
      analyses: [],
    });
    expect(withPartner.find(topic => topic.id === "comissoes")?.content).toContain("Imobiliária Parceira: R$ 15.000,00");
  });

  it("inclui as formas de pagamento detalhadas no tópico de preço", () => {
    const withPaymentEntries = buildGuidedTopics({
      deal: { title: "Apartamento", propertyAddress: "Rua das Acácias, 10", transactionType: "venda", estimatedValue: 500000, deadline: null },
      intakes: [{ contactName: null, contactEmail: null, contactPhone: null, payload: { price: 500000, paymentEntries: [{ amount: 100000, description: "Sinal na assinatura" }, { amount: 400000, description: "Financiamento bancário" }] } }],
      parties: [],
      checklist: [],
      analyses: [],
    });
    const priceTopic = withPaymentEntries.find(topic => topic.id === "preco");
    expect(priceTopic?.content).toContain("Formas de pagamento detalhadas");
    expect(priceTopic?.content).toContain("Sinal na assinatura");
    expect(priceTopic?.content).toContain("Financiamento bancário");
  });

  it("separa o contexto negociado da cláusula-base em cada tópico", () => {
    const withTemplate = buildGuidedTopics({
      deal: { title: "Apartamento", propertyAddress: "Rua das Acácias, 10", transactionType: "venda", estimatedValue: 500000, deadline: null },
      intakes: [{ contactName: null, contactEmail: null, contactPhone: null, payload: { price: 500000, paymentEntries: [{ amount: 100000, description: "Sinal" }] } }],
      parties: [], checklist: [], analyses: [],
    }, "PREÇO\nCLÁUSULA PADRÃO DE PAGAMENTO.");
    const priceTopic = withTemplate.find(topic => topic.id === "preco");
    expect(priceTopic?.baseContent).toContain("CLÁUSULA PADRÃO DE PAGAMENTO");
    expect(priceTopic?.businessContext).toContain("R$");
    expect(priceTopic?.businessContext).toContain("Sinal");
  });

  it("preserva a edição manual ao atualizar apenas o contexto de um tópico salvo", () => {
    const fresh = topics;
    const saved = fresh.map(topic => topic.id === "preco" ? { ...topic, content: "Cláusula manualmente revisada.", baseContent: "", businessContext: "" } : topic);
    const hydrated = hydrateGuidedTopics(saved, fresh);
    const priceTopic = hydrated.find(topic => topic.id === "preco");
    expect(priceTopic?.content).toBe("Cláusula manualmente revisada.");
    expect(priceTopic?.baseContent).toBe(fresh.find(topic => topic.id === "preco")?.baseContent);
  });
});
