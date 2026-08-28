import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Dados do negócio — salvamento automático", () => {
  it("agenda a persistência tanto no painel interno quanto no link compartilhável", () => {
    const form = projectFile("client/src/components/ContractIntakeForm.tsx");
    expect(form).toContain("window.setTimeout");
    expect(form).toContain("saveForDeal.mutate");
    expect(form).toContain("savePublic.mutate");
    expect(form).toContain("As alterações serão salvas automaticamente");
    expect(form).toContain('saveState === "erro"');
  });

  it("mantém o mesmo formulário conectado à página segura do corretor", () => {
    const publicPage = projectFile("client/src/pages/PublicPages.tsx");
    expect(publicPage).toContain('<ContractIntakeForm token={token}');
    expect(publicPage).toContain('mode="compartilhado"');
    expect(publicPage).toContain("Dados do negócio");
  });
});
