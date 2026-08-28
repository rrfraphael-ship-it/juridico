export type GuidedTopicStatus = "preenchido" | "atencao" | "pendente";

export type GuidedTopic = {
  id: "partes" | "objeto" | "compromisso" | "preco" | "posse" | "titulo" | "comissoes" | "cominacoes" | "foro_privacidade" | "formatacoes";
  title: string;
  content: string;
  baseContent: string;
  businessContext: string;
  status: GuidedTopicStatus;
  sources: string[];
};

type ProcessContext = {
  deal: { title: string; propertyAddress: string; transactionType: string; estimatedValue: number | null; deadline: Date | string | null };
  intakes: Array<{ contactName: string | null; contactEmail: string | null; contactPhone: string | null; payload: unknown; notes?: string | null }>;
  parties: Array<{ role: string; fullName: string; documentNumber: string | null; email: string | null; phone: string | null; commissionAmount?: number | null }>;
  checklist: Array<{ title: string; status: "pendente" | "em_revisao" | "aprovado" | "dispensado"; attachedDocumentId: number | null }>;
  analyses: Array<{ riskLevel: "baixo" | "moderado" | "alto" | "indeterminado"; summary: string | null; findings: unknown }>;
};

const labels: Record<GuidedTopic["id"], string> = {
  partes: "Partes",
  objeto: "Objeto",
  compromisso: "Compromisso",
  preco: "Preço",
  posse: "Posse",
  titulo: "Título Definitivo",
  comissoes: "Comissões",
  cominacoes: "Irretratabilidade e Cominações",
  foro_privacidade: "Foro e Privacidade de Dados",
  formatacoes: "Formatações",
};

export const guidedTopicOrder = Object.keys(labels) as GuidedTopic["id"][];

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function partyText(parties: ProcessContext["parties"]) {
  const roleLabel: Record<string, string> = { comprador: "Comprador", vendedor: "Vendedor", locador: "Locador", locatario: "Locatário", parceiro: "Parceiro" };
  return parties.map(party => `${roleLabel[party.role] ?? party.role}: ${party.fullName}${party.documentNumber ? ` (${party.documentNumber})` : ""}`).join("\n");
}

function paymentEntriesText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as { amount?: unknown; description?: unknown };
    const amount = typeof entry.amount === "number" && Number.isFinite(entry.amount) ? currency(entry.amount) : "valor pendente";
    const description = typeof entry.description === "string" ? entry.description.trim() : "";
    return description ? [`• ${amount} — ${description}`] : [];
  }).join("\n");
}

function status(hasValue: boolean, attention = false): GuidedTopicStatus {
  return attention ? "atencao" : hasValue ? "preenchido" : "pendente";
}

function templateSection(template: string, topic: GuidedTopic["id"]) {
  if (!template.trim()) return "";
  const title = labels[topic].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const direct = template.match(new RegExp(`(?:^|\\n)\\s*(?:${title}|${topic.replace("_", " ")})\\s*[:\\n]([\\s\\S]*?)(?=\\n\\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ _-]{3,}[:\\n]|$)`, "i"));
  return direct?.[0]?.trim() ?? "";
}

function useTemplate(template: string, topic: GuidedTopic["id"], fallback: string) {
  const clause = templateSection(template, topic);
  return clause || fallback;
}

export function buildGuidedTopics(context: ProcessContext, standardTemplate = ""): GuidedTopic[] {
  const intake = context.intakes.find(item => item.payload) ?? context.intakes[0];
  const payload = (intake?.payload ?? {}) as Record<string, unknown>;
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  const stringValue = (key: string) => typeof payload[key] === "string" ? payload[key].trim() : "";
  const numberValue = (key: string) => typeof payload[key] === "number" ? payload[key] : null;
  const price = numberValue("price") ?? numberValue("rentAmount") ?? context.deal.estimatedValue;
  const paymentSchedule = stringValue("paymentSchedule");
  const paymentMethod = stringValue("paymentMethod");
  const paymentEntries = paymentEntriesText(payload.paymentEntries);
  const possessionDate = stringValue("possessionDate") || stringValue("startDate");
  const commissionAmount = numberValue("commissionAmount");
  const commissionPayer = stringValue("commissionPayer");
  const commissionPartners = context.parties.filter(party => party.role === "parceiro");
  const partnerCommissionText = commissionPartners.map(partner => `${partner.fullName}${partner.commissionAmount !== null && partner.commissionAmount !== undefined ? `: ${currency(partner.commissionAmount)}` : ": valor de comissão pendente"}`).join("\n");
  const conditions = stringValue("conditions") || stringValue("specialConditions") || stringValue("commercialTerms");
  const forumCity = stringValue("forumCity");
  const registryNumber = stringValue("registryNumber");
  const registryOffice = stringValue("registryOffice");
  const approved = context.checklist.filter(item => item.status === "aprovado" || item.status === "dispensado");
  const pending = context.checklist.filter(item => item.status !== "aprovado" && item.status !== "dispensado");
  const risks = context.analyses.filter(item => item.riskLevel === "alto" || item.riskLevel === "moderado");
  const operation = context.deal.transactionType === "venda" ? "compra e venda" : context.deal.transactionType === "locacao" ? "locação" : "operação imobiliária";
  const topicMap: Record<GuidedTopic["id"], Pick<GuidedTopic, "content" | "status" | "sources">> = {
    partes: { content: useTemplate(standardTemplate, "partes", context.parties.length ? partyText(context.parties) : "Identifique e qualifique todas as partes da operação."), status: status(Boolean(context.parties.length)), sources: [...(context.parties.length ? ["Partes do negócio"] : ["Pendente de qualificação"]), ...(standardTemplate ? ["Contrato padrão"] : [])] },
    objeto: { content: useTemplate(standardTemplate, "objeto", `Imóvel/objeto: ${context.deal.propertyAddress || "não informado"}.\nOperação: ${operation}.${registryNumber ? `\nMatrícula: ${registryNumber}${registryOffice ? ` · ${registryOffice}` : ""}.` : ""}`), status: status(Boolean(context.deal.propertyAddress && registryNumber)), sources: ["Cadastro do negócio", ...(intake ? ["Dados do negócio"] : []), ...(standardTemplate ? ["Contrato padrão"] : [])] },
    compromisso: { content: useTemplate(standardTemplate, "compromisso", `As partes formalizam um compromisso de ${operation} referente ao objeto descrito, observadas as condições deste instrumento.${conditions ? `\n\nCondições informadas: ${conditions}` : ""}`), status: status(Boolean(intake && conditions)), sources: [...(intake ? ["Dados do negócio"] : ["Cadastro do negócio"]), ...(standardTemplate ? ["Contrato padrão"] : [])] },
    preco: { content: useTemplate(standardTemplate, "preco", price !== null ? `Valor da operação: ${currency(price)}.${paymentMethod ? `\nForma de pagamento: ${paymentMethod}.` : ""}${paymentEntries ? `\n\nFormas de pagamento detalhadas:\n${paymentEntries}` : ""}${paymentSchedule ? `\n\nCronograma: ${paymentSchedule}` : ""}` : "Informe o preço, a forma de pagamento, os vencimentos, o sinal e as condições suspensivas."), status: status(price !== null && Boolean(paymentSchedule || paymentEntries)), sources: [...(price !== null ? ["Dados do negócio", "Cadastro do negócio"] : ["Pendente de informação comercial"]), ...(standardTemplate ? ["Contrato padrão"] : [])] },
    posse: { content: useTemplate(standardTemplate, "posse", possessionDate ? `A posse será transmitida em ${new Date(`${possessionDate}T12:00:00`).toLocaleDateString("pt-BR")}, observadas as responsabilidades e condições definidas neste instrumento.` : "Defina a data, a condição e as responsabilidades para imissão na posse."), status: status(Boolean(possessionDate)), sources: [...(possessionDate ? ["Dados do negócio"] : ["Pendente de condição de posse"]), ...(standardTemplate ? ["Contrato padrão"] : [])] },
    titulo: { content: useTemplate(standardTemplate, "titulo", approved.length ? `Evidências documentais verificadas:\n${approved.map(item => `• ${item.title}`).join("\n")}${pending.length ? `\n\nAinda pendentes/em revisão:\n${pending.map(item => `• ${item.title}`).join("\n")}` : ""}${risks.length ? `\n\nPontos de atenção identificados na diligência: ${risks.map(item => item.summary).filter(Boolean).join(" | ")}` : ""}` : "Relacione o título aquisitivo, matrícula e certidões aplicáveis ao imóvel."), status: status(Boolean(approved.length), Boolean(risks.length || pending.length)), sources: [...approved.map(item => `Diligência: ${item.title}`), ...(risks.length ? ["Análise de risco documental"] : []), ...(standardTemplate ? ["Contrato padrão"] : [])] },
    comissoes: { content: useTemplate(standardTemplate, "comissoes", commissionPartners.length ? `Parceiros e comissões informadas:\n${partnerCommissionText}${commissionAmount !== null ? `\n\nComissão total da operação: ${currency(commissionAmount)}${commissionPayer ? `, a cargo de ${commissionPayer}` : ""}.` : ""}` : commissionAmount !== null ? `A comissão informada é de ${currency(commissionAmount)}, a cargo de ${commissionPayer || "parte a confirmar"}.` : "Defina a comissão, responsáveis pelo pagamento, vencimento, condições de exigibilidade e eventuais notas fiscais."), status: status(commissionPartners.length ? commissionPartners.every(partner => partner.commissionAmount !== null && partner.commissionAmount !== undefined) : commissionAmount !== null && Boolean(commissionPayer)), sources: [commissionPartners.length || commissionAmount !== null ? "Dados do negócio" : "Pendente de definição comercial", ...(standardTemplate ? ["Contrato padrão"] : [])] },
    cominacoes: { content: useTemplate(standardTemplate, "cominacoes", conditions ? `As condições especiais e hipóteses de inadimplemento deverão observar o seguinte contexto do negócio: ${conditions}` : "Defina a irretratabilidade, hipóteses de rescisão, penalidades, perdas e danos e consequências do inadimplemento."), status: status(Boolean(conditions)), sources: [conditions ? "Dados do negócio" : "Revisão jurídica necessária", ...(standardTemplate ? ["Contrato padrão"] : [])] },
    foro_privacidade: { content: useTemplate(standardTemplate, "foro_privacidade", forumCity ? `Fica eleito o foro da comarca de ${forumCity}, observadas as disposições de comunicações e tratamento de dados previstas neste instrumento.` : "Defina o foro de eleição, comunicações entre as partes e as disposições de tratamento de dados pessoais aplicáveis à operação."), status: status(Boolean(forumCity)), sources: [forumCity ? "Dados do negócio" : "Revisão jurídica necessária", ...(standardTemplate ? ["Contrato padrão"] : [])] },
    formatacoes: { content: useTemplate(standardTemplate, "formatacoes", `Prazo de referência da operação: ${context.deal.deadline ? new Date(context.deal.deadline).toLocaleDateString("pt-BR") : "não informado"}.\nDefina testemunhas, anexos, assinaturas e demais requisitos formais.`), status: status(Boolean(context.deal.deadline)), sources: [...(context.deal.deadline ? ["Dados do negócio", "Cadastro do negócio"] : ["Pendente de requisitos formais"]), ...(standardTemplate ? ["Contrato padrão"] : [])] },
  };
  const businessContext: Record<GuidedTopic["id"], string> = {
    partes: partyText(context.parties) || "Nenhuma parte qualificada foi informada.",
    objeto: `${context.deal.propertyAddress || "Endereço pendente"} · ${operation} · matrícula ${registryNumber || "pendente"}${registryOffice ? ` · ${registryOffice}` : ""}`,
    compromisso: conditions || notes || "Condições comerciais pendentes.",
    preco: price !== null ? `${currency(price)}${paymentMethod ? ` · ${paymentMethod}` : ""}${paymentEntries ? `\n${paymentEntries}` : ""}${paymentSchedule ? `\nCronograma: ${paymentSchedule}` : ""}` : "Preço e forma de pagamento pendentes.",
    posse: possessionDate || "Data e condições de posse pendentes.",
    titulo: `${approved.map(item => item.title).join("; ")} ${risks.map(item => item.summary).filter(Boolean).join("; ")}`.trim() || "Diligência documental pendente.",
    comissoes: commissionPartners.length ? partnerCommissionText : commissionAmount !== null ? `${currency(commissionAmount)} · ${commissionPayer || "responsável pendente"}` : "Comissão pendente.",
    cominacoes: conditions || "Condições de rescisão e penalidades pendentes.",
    foro_privacidade: forumCity || "Foro pendente.",
    formatacoes: context.deal.deadline ? new Date(context.deal.deadline).toLocaleDateString("pt-BR") : "Requisitos formais pendentes.",
  };
  return guidedTopicOrder.map(id => ({ id, title: labels[id], ...topicMap[id], baseContent: topicMap[id].content, businessContext: businessContext[id] }));
}

export function hydrateGuidedTopics(savedTopics: GuidedTopic[], freshTopics: GuidedTopic[]) {
  const freshById = new Map(freshTopics.map(topic => [topic.id, topic]));
  return savedTopics.map(saved => {
    const fresh = freshById.get(saved.id);
    return fresh ? { ...fresh, ...saved, baseContent: saved.baseContent || fresh.baseContent, businessContext: saved.businessContext || fresh.businessContext } : saved;
  });
}

export function composeGuidedContract(topics: GuidedTopic[]) {
  return topics.map(topic => `${topic.title.toUpperCase()}\n\n${topic.content.trim() || "[Pendente de preenchimento]"}`).join("\n\n");
}

export function validateGuidedTopics(topics: GuidedTopic[]) {
  if (topics.length !== guidedTopicOrder.length) throw new Error("A minuta deve conter todos os tópicos jurídicos.");
  const seen = new Set(topics.map(topic => topic.id));
  if (seen.size !== guidedTopicOrder.length || guidedTopicOrder.some(id => !seen.has(id))) throw new Error("A estrutura de tópicos jurídicos é inválida.");
  if (topics.some(topic => !topic.content.trim())) throw new Error("Preencha todos os tópicos antes de salvar a minuta guiada.");
}
