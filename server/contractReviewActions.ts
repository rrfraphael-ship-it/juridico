import { canWriteToReview, isAnchoredSelectionValid } from "./contractReviewDomain";
import { buildFinalApprovalNotification, buildReviewCommentSubmission } from "./contractReviewWorkflow";

export type ReviewActionContext = {
  id: number;
  ownerId: number;
  dealId: number;
  contractVersion: number;
  contentSnapshot: string;
  approvedAt: Date | null;
};

export function prepareAnchoredCommentAction(review: ReviewActionContext, input: { authorName: string; content: string; selectedText?: string | null; selectionStart?: number | null; selectionEnd?: number | null }) {
  if (!canWriteToReview(review)) throw new Error("Esta minuta já recebeu aprovação final.");
  const hasAnchor = input.selectedText !== null && input.selectedText !== undefined;
  if (hasAnchor) {
    if (input.selectionStart === null || input.selectionStart === undefined || input.selectionEnd === null || input.selectionEnd === undefined || input.selectionEnd <= input.selectionStart) throw new Error("A seleção do trecho é inválida.");
    if (!isAnchoredSelectionValid(review.contentSnapshot, input.selectedText!, input.selectionStart, input.selectionEnd)) throw new Error("O trecho selecionado não corresponde à minuta compartilhada.");
  }
  return buildReviewCommentSubmission({ reviewLinkId: review.id, ownerId: review.ownerId, dealId: review.dealId, contractVersion: review.contractVersion, ...input });
}

export function prepareFinalApprovalAction(review: ReviewActionContext, input: { authorName: string; approvalNote?: string }) {
  if (!canWriteToReview(review)) throw new Error("Esta minuta já foi aprovada.");
  return {
    reviewUpdate: { approvedAt: new Date(), approvedBy: input.authorName, approvalNote: input.approvalNote ?? null, status: "enviado" as const },
    notification: buildFinalApprovalNotification({ ownerId: review.ownerId, dealId: review.dealId, contractVersion: review.contractVersion, authorName: input.authorName }),
  };
}
