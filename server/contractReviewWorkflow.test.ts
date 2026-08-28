import { describe, expect, it } from "vitest";
import { buildFinalApprovalNotification, buildReviewCommentSubmission, buildReviewLinkRecord } from "./contractReviewWorkflow";

describe("fluxo de revisão contratual compartilhada", () => {
  it("congela a versão e o conteúdo enviados em um link de revisão", () => {
    const record = buildReviewLinkRecord({ ownerId: 8, dealId: 14, contractId: 21, contractVersion: 4, title: "Minuta de compra e venda", content: "Cláusula primeira", token: "token-seguro", expiresAt: new Date("2026-09-08T12:00:00.000Z") });
    expect(record).toMatchObject({ dealId: 14, contractId: 21, contractVersion: 4, titleSnapshot: "Minuta de compra e venda", contentSnapshot: "Cláusula primeira", status: "ativo" });
  });

  it("vincula cada comentário à revisão e cria a notificação do operador", () => {
    const submission = buildReviewCommentSubmission({ reviewLinkId: 5, ownerId: 8, dealId: 14, contractVersion: 4, authorName: "Cliente", content: "Revisar a cláusula de prazo.", selectedText: "O prazo será de 30 dias.", selectionStart: 18, selectionEnd: 42 });
    expect(submission.comment).toEqual({ reviewLinkId: 5, authorName: "Cliente", content: "Revisar a cláusula de prazo.", selectedText: "O prazo será de 30 dias.", selectionStart: 18, selectionEnd: 42 });
    expect(submission.notification).toMatchObject({ ownerId: 8, dealId: 14, type: "acao_pendente", title: "Novo comentário na minuta", actionPath: "/negocios/14" });
  });

  it("notifica o operador quando o cliente aprova a versão final", () => {
    expect(buildFinalApprovalNotification({ ownerId: 8, dealId: 14, contractVersion: 4, authorName: "Cliente" })).toMatchObject({ ownerId: 8, dealId: 14, title: "Minuta aprovada pelo cliente", actionPath: "/negocios/14" });
  });
});
