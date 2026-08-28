import { describe, expect, it } from "vitest";
import { buildTopicRewritePrompt, parseTopicRewrite } from "./contractTopicAI";

const topic = { id: "preco" as const, title: "Preço", content: "Texto atual da cláusula.", baseContent: "CLÁUSULA PADRÃO DE PREÇO.", businessContext: "R$ 500.000,00 · Sinal na assinatura.", status: "pendente" as const, sources: ["Dados do negócio"] };

describe("reescrita contratual por IA", () => {
  it("monta uma sugestão limitada à cláusula-base, aos dados do negócio e à orientação do operador", () => {
    const prompt = buildTopicRewritePrompt({ topic, operatorNote: "Prever o sinal na assinatura.", diligenceSummary: "Matrícula em revisão." });
    expect(prompt).toContain("CLÁUSULA PADRÃO DE PREÇO");
    expect(prompt).toContain("Sinal na assinatura");
    expect(prompt).toContain("Prever o sinal");
    expect(prompt).toContain("O operador decidirá depois se aplica ou descarta");
    expect(prompt).toContain("Não elimine proteções");
  });
  it("aceita somente conteúdo e estado válidos", () => {
    expect(parseTopicRewrite('{"content":"O preço é R$ 500.000,00.","status":"preenchido","summary":"Inclui o preço informado."}', topic)).toEqual({ content: "O preço é R$ 500.000,00.", status: "preenchido", summary: "Inclui o preço informado." });
    expect(() => parseTopicRewrite('{"content":""}', topic)).toThrow();
  });
});
