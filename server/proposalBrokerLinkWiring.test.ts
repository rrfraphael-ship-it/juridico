import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("integração do formulário de proposta pelo corretor", () => {
  const crmPage = readFileSync(new URL("../client/src/pages/CrmPages.tsx", import.meta.url), "utf8");
  const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
  const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

  it("oferece link seguro para proposta nova e para edição de proposta existente", () => {
    expect(app).toContain("Formulário do corretor");
    expect(crmPage).toContain("BrokerProposalEditLink");
    expect(crmPage).toContain("createLink.mutate({ proposalId })");
    expect(router).toContain("createBrokerLink: protectedProcedure");
    expect(router).toContain("proposalId: z.number().int().positive().nullable().optional()");
  });

  it("registra o formulário externo de corretor e a mutation de salvamento independente do negócio", () => {
    expect(app).toContain('path="/proposta-corretor/:token"');
    expect(router).toContain("getBrokerDraft: publicProcedure");
    expect(router).toContain("saveBrokerDraft: publicProcedure");
    expect(router).toContain("await db.update(proposalBrokerLinks).set({ proposalId })");
  });
});
