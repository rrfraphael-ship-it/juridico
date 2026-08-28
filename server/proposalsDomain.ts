export type ProposalTransactionType = "venda" | "locacao" | "outro";
export type ProposalParty = { role: "vendedor" | "comprador" | "locador" | "locatario" | "corretor" | "parceiro" | "outro"; name: string; document?: string; email?: string; phone?: string; commissionAmount?: number };
export type ConvertibleProposal = { transactionType: ProposalTransactionType; propertyAddress: string; offerAmount: number | null; paymentMethod: string | null; paymentFlow: string | null; conditions: string | null; futureParties: ProposalParty[] };

export function canConvertProposal(status: string, dealId: number | null) {
  return status === "aceita" && !dealId;
}

function partyDraft(party?: ProposalParty) {
  return party ? { name: party.name, document: party.document ?? "", email: party.email ?? "", phone: party.phone ?? "", maritalStatus: "", occupation: "", address: "" } : {};
}

export function buildProposalDealDraft(proposal: ConvertibleProposal) {
  const sellerRoles = proposal.transactionType === "locacao" ? ["locador"] : ["vendedor"];
  const buyerRoles = proposal.transactionType === "locacao" ? ["locatario"] : ["comprador"];
  const sellers = proposal.futureParties.filter(party => sellerRoles.includes(party.role)).map(partyDraft);
  const buyers = proposal.futureParties.filter(party => buyerRoles.includes(party.role)).map(partyDraft);
  const partners = proposal.futureParties.filter(party => party.role === "parceiro" || party.role === "corretor").map(party => ({ ...partyDraft(party), commissionAmount: party.commissionAmount ?? 0 }));
  const common = { transactionType: proposal.transactionType, propertyAddress: proposal.propertyAddress, sellerOrLandlord: sellers[0] ?? {}, buyerOrTenant: buyers[0] ?? {}, sellers, buyers, partners, registryNumber: "", registryOffice: "", city: "", state: "", forumCity: "" };
  if (proposal.transactionType === "venda") return { ...common, price: proposal.offerAmount ?? undefined, paymentMethod: proposal.paymentMethod ?? "", paymentSchedule: proposal.paymentFlow ?? "", conditions: proposal.conditions ?? "", depositAmount: undefined, possessionDate: "", deedDeadline: "", commissionAmount: partners.reduce((total, party) => total + (party.commissionAmount ?? 0), 0), commissionPayer: "" };
  if (proposal.transactionType === "locacao") return { ...common, rentAmount: proposal.offerAmount ?? undefined, paymentMethod: proposal.paymentMethod ?? "", paymentSchedule: proposal.paymentFlow ?? "", specialConditions: proposal.conditions ?? "", termMonths: undefined, startDate: "", paymentDueDay: undefined, adjustmentIndex: "", guaranteeType: "", condoResponsibility: "", iptuResponsibility: "" };
  return { ...common, commercialTerms: proposal.paymentFlow ?? "", specialConditions: proposal.conditions ?? "" };
}

export function proposalPartyLabel(role: ProposalParty["role"]) {
  return ({ vendedor: "Vendedor", comprador: "Comprador", locador: "Locador", locatario: "Locatário", corretor: "Corretor", parceiro: "Parceiro", outro: "Outra parte" } as const)[role];
}
