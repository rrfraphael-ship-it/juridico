export function isBrokerProposalLinkAvailable(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() >= now.getTime();
}

export function canBrokerEditProposal(status: string) {
  return status === "rascunho";
}
