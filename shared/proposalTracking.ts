export type ProposalTrackingStatus = "rascunho" | "enviada" | "aceita" | "recusada" | "convertida";

export function getProposalDeliveryState(status: ProposalTrackingStatus, viewedAt?: Date | string | null) {
  const sent = status !== "rascunho";
  const responded = status === "aceita" || status === "recusada" || status === "convertida";
  const viewed = Boolean(viewedAt) || responded;
  return {
    sent,
    viewed,
    responded,
    responseLabel: status === "recusada" ? "Recusada" : responded ? "Aceita" : "Resposta pendente",
  };
}
