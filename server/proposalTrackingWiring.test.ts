import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("integração do rastreio de propostas", () => {
  it("registra a primeira visualização somente para proposta enviada", () => {
    const source = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const publicProposal = source.slice(source.indexOf("getPublic:"), source.indexOf("respond:"));

    expect(publicProposal).toContain('proposal.status === "enviada" && !proposal.viewedAt');
    expect(publicProposal).toContain("set({ viewedAt })");
    expect(publicProposal).toContain("return { ...proposal, viewedAt }");
  });

  it("reinicia a visualização quando a proposta é revisada ou reenviada e mostra os três marcos", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../client/src/pages/CrmPages.tsx", import.meta.url), "utf8");
    const tracking = readFileSync(new URL("../shared/proposalTracking.ts", import.meta.url), "utf8");

    expect(router).toContain("status: \"rascunho\", viewedAt: null");
    expect(router).toContain('status: "enviada", viewedAt: null');
    expect(page).toContain("ProposalStatusTimeline");
    expect(page).toContain("Visualizada");
    expect(tracking).toContain("Resposta pendente");
  });
});
