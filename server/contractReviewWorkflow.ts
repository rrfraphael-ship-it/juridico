export type ReviewSnapshot = {
  ownerId: number;
  dealId: number;
  contractId: number;
  contractVersion: number;
  title: string;
  content: string;
};

export function buildReviewLinkRecord(input: ReviewSnapshot & { token: string; expiresAt: Date }) {
  return {
    ownerId: input.ownerId,
    dealId: input.dealId,
    contractId: input.contractId,
    token: input.token,
    contractVersion: input.contractVersion,
    titleSnapshot: input.title,
    contentSnapshot: input.content,
    status: "ativo" as const,
    expiresAt: input.expiresAt,
  };
}

export function buildReviewCommentSubmission(input: { reviewLinkId: number; ownerId: number; dealId: number; contractVersion: number; authorName: string; content: string; selectedText?: string | null; selectionStart?: number | null; selectionEnd?: number | null }) {
  return {
    comment: { reviewLinkId: input.reviewLinkId, authorName: input.authorName, content: input.content, selectedText: input.selectedText ?? null, selectionStart: input.selectionStart ?? null, selectionEnd: input.selectionEnd ?? null },
    notification: {
      ownerId: input.ownerId,
      dealId: input.dealId,
      type: "acao_pendente" as const,
      severity: "info" as const,
      title: "Novo comentário na minuta",
      content: `${input.authorName} enviou um comentário para a versão ${input.contractVersion} do contrato.`,
      actionPath: `/negocios/${input.dealId}`,
    },
  };
}

export function buildFinalApprovalNotification(input: { ownerId: number; dealId: number; contractVersion: number; authorName: string }) {
  return {
    ownerId: input.ownerId,
    dealId: input.dealId,
    type: "acao_pendente" as const,
    severity: "info" as const,
    title: "Minuta aprovada pelo cliente",
    content: `${input.authorName} confirmou a versão ${input.contractVersion} da minuta como correta.`,
    actionPath: `/negocios/${input.dealId}`,
  };
}
