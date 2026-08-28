export type ContractProgressStatus = "rascunho" | "revisao_interna" | "revisao_cliente" | "finalizado";

export function getContractProgress(status?: ContractProgressStatus | null) {
  if (!status) return 0;
  return { rascunho: 25, revisao_interna: 60, revisao_cliente: 80, finalizado: 100 }[status];
}

export function getDiligenceProgress(items: Array<{ status: "pendente" | "em_revisao" | "aprovado" | "dispensado" }>) {
  if (!items.length) return 0;
  const done = items.filter(item => item.status === "aprovado" || item.status === "dispensado").length;
  return Math.round((done / items.length) * 100);
}

export function buildPendingActions(input: {
  deals: Array<{ id: number; title: string; stage: string }>;
  contracts: Array<{ dealId: number }>;
  diligenceItems: Array<{ dealId: number; attachedDocumentId: number | null; status: "pendente" | "em_revisao" | "aprovado" | "dispensado" }>;
}) {
  return input.deals.flatMap(deal => {
    const dealItems = input.diligenceItems.filter(item => item.dealId === deal.id);
    const missingDocuments = dealItems.filter(item => item.status === "pendente" && !item.attachedDocumentId).length;
    if (deal.stage === "intake") return [{ dealId: deal.id, title: "Aguardando informações do intake", content: `${deal.title} precisa das informações iniciais para avançar.`, actionPath: `/negocios/${deal.id}` }];
    if (missingDocuments > 0) return [{ dealId: deal.id, title: "Certidões pendentes", content: `${deal.title} possui ${missingDocuments} item${missingDocuments === 1 ? "" : "s"} de diligência sem anexo.`, actionPath: `/negocios/${deal.id}` }];
    if (!input.contracts.some(contract => contract.dealId === deal.id) && deal.stage !== "diligence") return [{ dealId: deal.id, title: "Minuta contratual pendente", content: `${deal.title} ainda não possui uma minuta contratual iniciada.`, actionPath: `/negocios/${deal.id}` }];
    return [];
  });
}
