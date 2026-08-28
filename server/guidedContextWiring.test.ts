import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("editor contextual da minuta", () => {
  it("mantém contexto, cláusula editável e decisão explícita de aplicar ou descartar a sugestão", () => {
    const source = readFileSync(new URL("../client/src/components/GuidedContractComposer.tsx", import.meta.url), "utf8");
    expect(source).toContain("Dados do negócio · contexto do tópico");
    expect(source).toContain("Cláusula ou capítulo em edição");
    expect(source).toContain("Gerar sugestão por IA");
    expect(source).toContain("Aplicar à cláusula");
    expect(source).toContain("Descartar sugestão");
  });
});
