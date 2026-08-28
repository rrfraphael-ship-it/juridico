export type ReviewLinkState = { status: "ativo" | "enviado" | "revogado"; contractVersion: number; expiresAt: Date };

export function isReviewLinkAvailable(link: Pick<ReviewLinkState, "status" | "expiresAt">, now = new Date()) {
  return link.status !== "revogado" && link.expiresAt.getTime() > now.getTime();
}

export function findReusableReviewLink<T extends ReviewLinkState>(links: T[], contractVersion: number, now = new Date()) {
  return links.find(link => link.status === "ativo" && link.contractVersion === contractVersion && isReviewLinkAvailable(link, now));
}

export function createReviewExpiry(now = new Date(), days = 14) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function buildReviewPath(token: string) {
  return `/revisao/${token}`;
}

export function isAnchoredSelectionValid(content: string, selectedText: string, selectionStart: number, selectionEnd: number) {
  return selectionStart >= 0 && selectionEnd > selectionStart && selectionEnd <= content.length && content.slice(selectionStart, selectionEnd) === selectedText;
}

export function canWriteToReview(link: { approvedAt: Date | null }) {
  return !link.approvedAt;
}
