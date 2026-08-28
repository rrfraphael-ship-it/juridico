import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("estados visíveis do Copiloto com anexos", () => {
  const panel = readFileSync(new URL("../client/src/components/CopilotAttachmentsPanel.tsx", import.meta.url), "utf8");
  const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

  it("expõe carregamento e falha nas operações de upload e comparação", () => {
    expect(panel).toContain("upload.isPending");
    expect(panel).toContain("compare.isPending");
    expect(panel).toContain("onError: error => toast.error(error.message)");
    expect(panel).toContain("Comparação assistida concluída.");
  });

  it("mantém rotas independentes para upload seguro e comparação das duas minutas selecionadas", () => {
    expect(router).toContain("uploadAttachment: protectedProcedure");
    expect(router).toContain("compareMinutas: protectedProcedure");
    expect(router).toContain("selectMinutasForComparison");
  });
});
