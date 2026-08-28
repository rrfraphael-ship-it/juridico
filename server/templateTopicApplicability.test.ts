import { describe, expect, it } from "vitest";
import { inferTemplateTopicApplicability } from "./templateTopicApplicability";

describe("mapeamento de tópicos aplicáveis do modelo", () => {
  it("identifica capítulos que recebem Dados do negócio sem reescrever a minuta", () => {
    const result = inferTemplateTopicApplicability("PARTES E QUALIFICAÇÃO\nOBJETO: imóvel e matrícula.\nPREÇO E FORMA DE PAGAMENTO\nPOSSE\nFORO E LGPD\nASSINATURAS E TESTEMUNHAS");
    expect(result).toHaveLength(10);
    expect(result.find(item => item.topicId === "partes")).toMatchObject({ applicable: true });
    expect(result.find(item => item.topicId === "preco")).toMatchObject({ applicable: true });
    expect(result.find(item => item.topicId === "comissoes")).toMatchObject({ applicable: false });
    expect(result.every(item => item.reason.length > 0)).toBe(true);
  });
});
