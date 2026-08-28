import { describe, expect, it } from "vitest";
import { prepareAnchoredCommentAction, prepareFinalApprovalAction } from "./contractReviewActions";

describe("ações públicas de revisão contratual", () => {
  const content = "Cláusula primeira: o prazo será de 30 dias.";
  const review = { id: 7, ownerId: 1, dealId: 9, contractVersion: 3, contentSnapshot: content, approvedAt: null };

  it("prepara um comentário ancorado e a notificação correspondente", () => {
    const selectedText = "o prazo será de 30 dias";
    const selectionStart = content.indexOf(selectedText);
    const action = prepareAnchoredCommentAction(review, { authorName: "Cliente", content: "Solicito confirmação deste prazo.", selectedText, selectionStart, selectionEnd: selectionStart + selectedText.length });
    expect(action.comment).toMatchObject({ reviewLinkId: 7, selectedText, selectionStart });
    expect(action.notification).toMatchObject({ ownerId: 1, dealId: 9, title: "Novo comentário na minuta" });
  });

  it("rejeita uma âncora que não corresponde à minuta congelada", () => {
    expect(() => prepareAnchoredCommentAction(review, { authorName: "Cliente", content: "Comentário", selectedText: "texto inexistente", selectionStart: 0, selectionEnd: 16 })).toThrow("não corresponde");
  });

  it("prepara a aprovação final, notifica o operador e bloqueia retornos posteriores", () => {
    const approval = prepareFinalApprovalAction(review, { authorName: "Cliente", approvalNote: "De acordo." });
    expect(approval.reviewUpdate).toMatchObject({ approvedBy: "Cliente", status: "enviado" });
    expect(approval.notification).toMatchObject({ dealId: 9, title: "Minuta aprovada pelo cliente" });
    expect(() => prepareAnchoredCommentAction({ ...review, approvedAt: new Date() }, { authorName: "Cliente", content: "Comentário posterior" })).toThrow("aprovação final");
  });
});
