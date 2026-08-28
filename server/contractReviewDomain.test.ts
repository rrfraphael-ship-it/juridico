import { describe, expect, it } from "vitest";
import { buildReviewPath, canWriteToReview, createReviewExpiry, findReusableReviewLink, isAnchoredSelectionValid, isReviewLinkAvailable } from "./contractReviewDomain";

describe("links seguros de revisão contratual", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("aceita apenas links não revogados e dentro da validade", () => {
    expect(isReviewLinkAvailable({ status: "ativo", expiresAt: new Date("2026-08-26T12:00:00.000Z") }, now)).toBe(true);
    expect(isReviewLinkAvailable({ status: "revogado", expiresAt: new Date("2026-08-26T12:00:00.000Z") }, now)).toBe(false);
    expect(isReviewLinkAvailable({ status: "ativo", expiresAt: new Date("2026-08-24T12:00:00.000Z") }, now)).toBe(false);
  });

  it("reaproveita somente o link ativo da mesma versão", () => {
    const link = findReusableReviewLink([{ id: 1, status: "ativo" as const, contractVersion: 3, expiresAt: new Date("2026-08-27T12:00:00.000Z") }], 3, now);
    expect(link?.id).toBe(1);
    expect(findReusableReviewLink([{ id: 1, status: "ativo" as const, contractVersion: 3, expiresAt: new Date("2026-08-27T12:00:00.000Z") }], 4, now)).toBeUndefined();
  });

  it("cria validade padrão de quatorze dias", () => {
    expect(createReviewExpiry(now)).toEqual(new Date("2026-09-08T12:00:00.000Z"));
  });

  it("aceita somente âncoras que correspondem exatamente ao texto congelado da minuta", () => {
    const content = "Cláusula primeira: o prazo será de 30 dias.";
    const selected = "o prazo será de 30 dias";
    const start = content.indexOf(selected);
    expect(isAnchoredSelectionValid(content, selected, start, start + selected.length)).toBe(true);
    expect(isAnchoredSelectionValid(content, "prazo diferente", start, start + selected.length)).toBe(false);
  });

  it("mantém a revisão por rota segura e bloqueia novos retornos após a aprovação", () => {
    expect(buildReviewPath("token-seguro")).toBe("/revisao/token-seguro");
    expect(canWriteToReview({ approvedAt: null })).toBe(true);
    expect(canWriteToReview({ approvedAt: now })).toBe(false);
  });
});
