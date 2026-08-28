import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("análise estrutural no cadastro do modelo", () => {
  it("analisa o modelo no anexo e apresenta o mapeamento antes de criar a minuta", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const composer = readFileSync(new URL("../client/src/components/GuidedContractComposer.tsx", import.meta.url), "utf8");
    expect(router).toContain("const topicApplicability = await analyzeTemplateTopicApplicability(content)");
    expect(router).toContain("topicApplicability: topicApplicability ?? inferTemplateTopicApplicability(content)");
    expect(composer).toContain("Dados aplicáveis");
    expect(composer).toContain("Sem dados aplicáveis");
    expect(composer).toContain("Texto preservado");
  });
});
