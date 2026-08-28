import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("isolamento de minuta selecionada", () => {
  const source = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

  it("consulta a minuta selecionada antes de montar a sugestão de IA", () => {
    const rewrite = source.slice(source.indexOf("rewriteGuidedTopic:"), source.indexOf("exportDocx:"));
    expect(rewrite).toContain("eq(contracts.id, input.contractId)");
    expect(rewrite).toContain("eq(contracts.dealId, input.dealId)");
    expect(rewrite).toContain("const topics = Array.isArray(contract.topicData)");
    expect(rewrite).toContain("const topic = topics.find(item => item.id === input.topicId)");
    expect(rewrite).toContain("buildTopicRewritePrompt({ topic");
  });

  it("cria e atualiza uma minuta somente pelo identificador do contrato informado", () => {
    const create = source.slice(source.indexOf("createGuidedDraft:"), source.indexOf("updateGuidedTopics:"));
    const update = source.slice(source.indexOf("updateGuidedTopics:"), source.indexOf("rewriteGuidedTopic:"));
    expect(create).toContain("db.insert(contracts).values");
    expect(update).toContain("eq(contracts.id, contract.id)");
    expect(update).toContain("eq(contracts.dealId, input.dealId)");
  });
});
