import type { GuidedTopic } from "./contractTopics";

export type WorkItemStatus = "pendente" | "em_andamento" | "bloqueado" | "concluido";
export type WorkItemMilestone = "intake" | "diligencia" | "minuta" | "revisao" | "assinatura" | "fechamento";
export type ApprovalLevel = "operacional" | "juridico" | "diretoria";

export function getSlaStatus(slaAt: Date | string | null, now = new Date()) {
  if (!slaAt) return "sem_sla" as const;
  const target = new Date(slaAt).getTime();
  if (target < now.getTime()) return "vencido" as const;
  if (target - now.getTime() <= 86_400_000) return "proximo" as const;
  return "dentro_do_prazo" as const;
}

export function requiredApprovalLevel(riskLevel: "baixo" | "moderado" | "alto"): ApprovalLevel {
  return riskLevel === "alto" ? "diretoria" : riskLevel === "moderado" ? "juridico" : "operacional";
}

export function canApproveException(required: ApprovalLevel, provided: ApprovalLevel) {
  const rank: Record<ApprovalLevel, number> = { operacional: 1, juridico: 2, diretoria: 3 };
  return rank[provided] >= rank[required];
}

export function kitAppliesToDeal(kitType: "venda" | "locacao" | "outro", dealType: "venda" | "locacao" | "outro") {
  return kitType === "outro" || kitType === dealType;
}

export function isDossierCategory(value: string): value is "partes" | "imovel" | "certidoes" | "municipal" | "condominio" | "contrato" | "financeiro" | "fechamento" | "outro" {
  return ["partes", "imovel", "certidoes", "municipal", "condominio", "contrato", "financeiro", "fechamento", "outro"].includes(value);
}

export type OperationContext = {
  ownerId: number;
  dealId: number;
  hasSubmittedIntake: boolean;
  diligenceComplete: boolean;
  hasContract: boolean;
  clientReviewApproved: boolean;
};

export function buildOperationWorkItems(context: OperationContext) {
  const completedAt = new Date();
  return [
    { ownerId: context.ownerId, dealId: context.dealId, milestone: "intake" as const, title: "Validar informações do intake", description: "Conferir dados das partes, imóvel, prazo e condições comerciais.", status: context.hasSubmittedIntake ? "concluido" as const : "pendente" as const, priority: "alta" as const, blocking: true, clientVisible: false, completedAt: context.hasSubmittedIntake ? completedAt : null },
    { ownerId: context.ownerId, dealId: context.dealId, milestone: "diligencia" as const, title: "Concluir diligência documental", description: "Verificar certidões, evidências e riscos antes de avançar com a minuta.", status: context.diligenceComplete ? "concluido" as const : "pendente" as const, priority: "alta" as const, blocking: true, clientVisible: true, completedAt: context.diligenceComplete ? completedAt : null },
    { ownerId: context.ownerId, dealId: context.dealId, milestone: "minuta" as const, title: "Consolidar minuta contratual", description: "Revisar tópicos jurídicos, dados ausentes e exceções antes da versão interna.", status: context.hasContract ? "concluido" as const : "pendente" as const, priority: "alta" as const, blocking: true, clientVisible: false, completedAt: context.hasContract ? completedAt : null },
    { ownerId: context.ownerId, dealId: context.dealId, milestone: "revisao" as const, title: "Obter revisão e aprovação das partes", description: "Compartilhar a minuta, tratar comentários e registrar a decisão do cliente.", status: context.clientReviewApproved ? "concluido" as const : "pendente" as const, priority: "alta" as const, blocking: true, clientVisible: true, completedAt: context.clientReviewApproved ? completedAt : null },
    { ownerId: context.ownerId, dealId: context.dealId, milestone: "assinatura" as const, title: "Preparar assinatura eletrônica", description: "Conferir signatários, ordem de assinatura e prazo do envelope.", status: "pendente" as const, priority: "media" as const, blocking: false, clientVisible: true, completedAt: null },
    { ownerId: context.ownerId, dealId: context.dealId, milestone: "fechamento" as const, title: "Fechar dossiê e arquivar processo", description: "Consolidar evidências finais, contrato assinado e histórico do processo.", status: "pendente" as const, priority: "media" as const, blocking: false, clientVisible: true, completedAt: null },
  ];
}

export function calculateContractCompleteness(topics: GuidedTopic[], exceptions: Array<{ topicId: string; status: string; riskLevel: string }>) {
  const items = topics.map(topic => {
    const topicExceptions = exceptions.filter(exception => exception.topicId === topic.id && (exception.status === "aberta" || exception.status === "rejeitada"));
    const highRiskOpen = topicExceptions.some(exception => exception.riskLevel === "alto");
    const blocking = topic.status === "pendente" || highRiskOpen || (topic.status === "atencao" && topicExceptions.length === 0);
    return {
      topicId: topic.id,
      title: topic.title,
      state: blocking ? "bloqueado" : topic.status === "preenchido" ? "pronto" : "revisar",
      blocking,
      sourceCount: topic.sources.length,
      exceptionCount: topicExceptions.length,
    };
  });
  const ready = items.filter(item => item.state === "pronto").length;
  const blocked = items.filter(item => item.blocking).length;
  return { items, ready, blocked, total: items.length, percentage: items.length ? Math.round((ready / items.length) * 100) : 0, canShare: blocked === 0 };
}

export function publicMilestoneLabel(milestone: WorkItemMilestone) {
  return ({ intake: "Intake", diligencia: "Diligência", minuta: "Minuta", revisao: "Revisão", assinatura: "Assinatura", fechamento: "Fechamento" } as const)[milestone];
}
