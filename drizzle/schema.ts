import {
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const dealStages = [
  "intake",
  "diligence",
  "draft",
  "internal_review",
  "client_review",
  "signed",
  "archived",
] as const;

export const transactionTypes = ["venda", "locacao", "outro"] as const;
export const proposalStatuses = ["rascunho", "enviada", "aceita", "recusada", "convertida"] as const;

export const deals = mysqlTable(
  "deals",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    transactionType: mysqlEnum("transactionType", transactionTypes).notNull(),
    stage: mysqlEnum("stage", dealStages).default("intake").notNull(),
    propertyAddress: text("propertyAddress").notNull(),
    deadline: timestamp("deadline"),
    estimatedValue: bigint("estimatedValue", { mode: "number" }),
    clientToken: varchar("clientToken", { length: 64 }).notNull().unique(),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("deals_owner_stage_idx").on(table.ownerId, table.stage)],
);

export const dealParties = mysqlTable(
  "deal_parties",
  {
    id: int("id").autoincrement().primaryKey(),
    dealId: int("dealId").notNull(),
    role: mysqlEnum("role", ["comprador", "vendedor", "locador", "locatario", "procurador", "corretor", "parceiro", "outro"]).notNull(),
    fullName: varchar("fullName", { length: 255 }).notNull(),
    documentNumber: varchar("documentNumber", { length: 40 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    commissionAmount: bigint("commissionAmount", { mode: "number" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("deal_parties_deal_idx").on(table.dealId)],
);

export const intakes = mysqlTable(
  "intakes",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId"),
    token: varchar("token", { length: 64 }).notNull().unique(),
    source: mysqlEnum("source", ["corretor", "parceiro", "operador"]).default("corretor").notNull(),
    contactName: varchar("contactName", { length: 160 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 40 }),
    payload: json("payload"),
    submittedAt: timestamp("submittedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("intakes_deal_idx").on(table.dealId), index("intakes_token_idx").on(table.token)],
);

export const proposals = mysqlTable(
  "proposals",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    transactionType: mysqlEnum("transactionType", transactionTypes).notNull(),
    status: mysqlEnum("status", proposalStatuses).default("rascunho").notNull(),
    propertyAddress: text("propertyAddress").notNull(),
    propertyIdentification: text("propertyIdentification"),
    offerAmount: bigint("offerAmount", { mode: "number" }),
    paymentMethod: varchar("paymentMethod", { length: 120 }),
    paymentFlow: text("paymentFlow"),
    conditions: text("conditions"),
    expiresAt: timestamp("expiresAt"),
    futureParties: json("futureParties").notNull(),
    accessToken: varchar("accessToken", { length: 64 }).notNull().unique(),
    recipientName: varchar("recipientName", { length: 180 }),
    respondedBy: varchar("respondedBy", { length: 180 }),
    responseNote: text("responseNote"),
    respondedAt: timestamp("respondedAt"),
    dealId: int("dealId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("proposals_owner_status_idx").on(table.ownerId, table.status), index("proposals_access_token_idx").on(table.accessToken), index("proposals_deal_idx").on(table.dealId)],
);

export const proposalBrokerLinks = mysqlTable(
  "proposal_broker_links",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    proposalId: int("proposalId"),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("proposal_broker_links_owner_idx").on(table.ownerId), index("proposal_broker_links_proposal_idx").on(table.proposalId)],
);

export const contractTemplates = mysqlTable(
  "contract_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    contractType: varchar("contractType", { length: 120 }).notNull().default("Contrato imobiliário"),
    transactionType: mysqlEnum("transactionType", transactionTypes).notNull(),
    content: text("content").notNull(),
    fields: json("fields").notNull(),
    topicApplicability: json("topicApplicability"),
    sourceFileName: varchar("sourceFileName", { length: 255 }),
    sourceFileKey: varchar("sourceFileKey", { length: 512 }),
    sourceFileUrl: varchar("sourceFileUrl", { length: 512 }),
    sourceFileMimeType: varchar("sourceFileMimeType", { length: 160 }),
    version: varchar("version", { length: 24 }).default("1.0").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("template_owner_idx").on(table.ownerId)],
);

export const contracts = mysqlTable(
  "contracts",
  {
    id: int("id").autoincrement().primaryKey(),
    dealId: int("dealId").notNull(),
    templateId: int("templateId"),
    contractType: varchar("contractType", { length: 120 }).notNull().default("Contrato imobiliário"),
    title: varchar("title", { length: 180 }).notNull(),
    content: text("content").notNull(),
    topicData: json("topicData"),
    status: mysqlEnum("status", ["rascunho", "revisao_interna", "revisao_cliente", "finalizado"]).default("rascunho").notNull(),
    version: int("version").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("contracts_deal_idx").on(table.dealId)],
);

export const contractReviewLinks = mysqlTable(
  "contract_review_links",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId").notNull(),
    contractId: int("contractId").notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    contractVersion: int("contractVersion").notNull(),
    titleSnapshot: varchar("titleSnapshot", { length: 180 }).notNull(),
    contentSnapshot: text("contentSnapshot").notNull(),
    status: mysqlEnum("status", ["ativo", "enviado", "revogado"]).default("ativo").notNull(),
    approvedAt: timestamp("approvedAt"),
    approvedBy: varchar("approvedBy", { length: 180 }),
    approvalNote: text("approvalNote"),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("contract_review_deal_idx").on(table.dealId), index("contract_review_contract_idx").on(table.contractId)],
);

export const contractReviewComments = mysqlTable(
  "contract_review_comments",
  {
    id: int("id").autoincrement().primaryKey(),
    reviewLinkId: int("reviewLinkId").notNull(),
    authorName: varchar("authorName", { length: 180 }).notNull(),
    content: text("content").notNull(),
    selectedText: text("selectedText"),
    selectionStart: int("selectionStart"),
    selectionEnd: int("selectionEnd"),
    status: mysqlEnum("status", ["novo", "resolvido"]).default("novo").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("contract_review_comment_link_idx").on(table.reviewLinkId)],
);

export const documents = mysqlTable(
  "documents",
  {
    id: int("id").autoincrement().primaryKey(),
    dealId: int("dealId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    kind: mysqlEnum("kind", ["certidao", "contrato", "intake", "assinatura", "outro"]).notNull(),
    category: mysqlEnum("category", ["partes", "imovel", "certidoes", "municipal", "condominio", "contrato", "financeiro", "fechamento", "outro"]).default("outro").notNull(),
    visibility: mysqlEnum("visibility", ["interno", "cliente"]).default("cliente").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
    mimeType: varchar("mimeType", { length: 160 }).notNull(),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  },
  table => [index("documents_deal_idx").on(table.dealId)],
);

export const dealWorkItems = mysqlTable(
  "deal_work_items",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId").notNull(),
    milestone: mysqlEnum("milestone", ["intake", "diligencia", "minuta", "revisao", "assinatura", "fechamento"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["pendente", "em_andamento", "bloqueado", "concluido"]).default("pendente").notNull(),
    priority: mysqlEnum("priority", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
    dueAt: timestamp("dueAt"),
    slaAt: timestamp("slaAt"),
    assigneeName: varchar("assigneeName", { length: 180 }),
    assigneeEmail: varchar("assigneeEmail", { length: 320 }),
    blocking: boolean("blocking").default(false).notNull(),
    clientVisible: boolean("clientVisible").default(false).notNull(),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("work_items_deal_status_idx").on(table.dealId, table.status), index("work_items_owner_due_idx").on(table.ownerId, table.dueAt)],
);

export const dealEvents = mysqlTable(
  "deal_events",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId").notNull(),
    type: mysqlEnum("type", ["intake", "diligencia", "documento", "minuta", "revisao", "tarefa", "excecao", "assinatura", "marco", "sistema"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    detail: text("detail"),
    actorName: varchar("actorName", { length: 180 }),
    payload: json("payload"),
    clientVisible: boolean("clientVisible").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("deal_events_deal_created_idx").on(table.dealId, table.createdAt)],
);

export const diligenceKits = mysqlTable(
  "diligence_kits",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    transactionType: mysqlEnum("transactionType", transactionTypes).notNull(),
    description: text("description"),
    items: json("items").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("diligence_kits_owner_type_idx").on(table.ownerId, table.transactionType)],
);

export const contractExceptions = mysqlTable(
  "contract_exceptions",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId").notNull(),
    contractId: int("contractId"),
    topicId: mysqlEnum("topicId", ["partes", "objeto", "compromisso", "preco", "posse", "titulo", "comissoes", "cominacoes", "foro_privacidade", "formatacoes"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    riskLevel: mysqlEnum("riskLevel", ["baixo", "moderado", "alto"]).default("moderado").notNull(),
    justification: text("justification"),
    requiredApprovalLevel: mysqlEnum("requiredApprovalLevel", ["operacional", "juridico", "diretoria"]).default("juridico").notNull(),
    approvedByLevel: mysqlEnum("approvedByLevel", ["operacional", "juridico", "diretoria"]),
    status: mysqlEnum("status", ["aberta", "aprovada", "rejeitada", "resolvida"]).default("aberta").notNull(),
    approverName: varchar("approverName", { length: 180 }),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("contract_exceptions_deal_idx").on(table.dealId), index("contract_exceptions_contract_idx").on(table.contractId)],
);

export const signatureEnvelopes = mysqlTable(
  "signature_envelopes",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId").notNull(),
    contractId: int("contractId").notNull(),
    provider: mysqlEnum("provider", ["clicksign", "d4sign", "zapsign", "outro"]).notNull(),
    status: mysqlEnum("status", ["rascunho", "pronto", "enviado", "visualizado", "assinado", "cancelado", "falha"]).default("rascunho").notNull(),
    externalId: varchar("externalId", { length: 255 }),
    signingUrl: varchar("signingUrl", { length: 1024 }),
    signers: json("signers").notNull(),
    expiresAt: timestamp("expiresAt"),
    sentAt: timestamp("sentAt"),
    signedAt: timestamp("signedAt"),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("signature_envelopes_deal_idx").on(table.dealId), index("signature_envelopes_contract_idx").on(table.contractId)],
);

export type DiligenceRiskFinding = {
  title: string;
  severity: "baixo" | "moderado" | "alto";
  detail: string;
  recommendation: string;
};

export const diligenceAnalyses = mysqlTable(
  "diligence_analyses",
  {
    id: int("id").autoincrement().primaryKey(),
    dealId: int("dealId").notNull(),
    diligenceItemId: int("diligenceItemId").notNull(),
    documentId: int("documentId").notNull(),
    status: mysqlEnum("status", ["processando", "concluida", "falha", "nao_suportado"]).default("processando").notNull(),
    riskLevel: mysqlEnum("riskLevel", ["baixo", "moderado", "alto", "indeterminado"]).default("indeterminado").notNull(),
    summary: text("summary"),
    findings: json("findings").$type<DiligenceRiskFinding[]>(),
    limitations: text("limitations"),
    errorMessage: text("errorMessage"),
    analyzedAt: timestamp("analyzedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("diligence_analyses_document_idx").on(table.documentId), index("diligence_analyses_deal_idx").on(table.dealId)],
);

export const diligenceItems = mysqlTable(
  "diligence_items",
  {
    id: int("id").autoincrement().primaryKey(),
    dealId: int("dealId").notNull(),
    category: mysqlEnum("category", ["federal", "trabalhista", "estadual", "municipal", "registral", "imovel", "outro"]).notNull(),
    catalogCode: varchar("catalogCode", { length: 80 }),
    title: varchar("title", { length: 255 }).notNull(),
    issuer: varchar("issuer", { length: 180 }),
    issuanceUrl: varchar("issuanceUrl", { length: 512 }),
    stateCode: varchar("stateCode", { length: 2 }),
    status: mysqlEnum("status", ["pendente", "em_revisao", "aprovado", "dispensado"]).default("pendente").notNull(),
    attachedDocumentId: int("attachedDocumentId"),
    expiresAt: timestamp("expiresAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("diligence_deal_idx").on(table.dealId)],
);

export const obligations = mysqlTable(
  "obligations",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    dueAt: timestamp("dueAt").notNull(),
    status: mysqlEnum("status", ["pendente", "concluida", "atrasada"]).default("pendente").notNull(),
    alertDaysBefore: int("alertDaysBefore").default(3).notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    lastAlertedAt: timestamp("lastAlertedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("obligation_owner_due_idx").on(table.ownerId, table.dueAt)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    dealId: int("dealId"),
    type: mysqlEnum("type", ["intake_recebido", "prazo_proximo", "risco_documental", "acao_pendente"]).notNull(),
    severity: mysqlEnum("severity", ["info", "atencao", "critico"]).default("info").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    actionPath: varchar("actionPath", { length: 512 }),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_owner_created_idx").on(table.ownerId, table.createdAt)],
);

export const legalLibrary = mysqlTable(
  "legal_library",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    category: mysqlEnum("category", ["legislacao", "jurisprudencia", "clausula", "procedimento", "nota"]).notNull(),
    content: text("content").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("library_owner_idx").on(table.ownerId)],
);

export const legalMessages = mysqlTable(
  "legal_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    sessionId: varchar("sessionId", { length: 64 }).notNull(),
    agent: mysqlEnum("agent", ["venda", "locacao", "diligencia", "comparador"]).notNull(),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("messages_owner_session_idx").on(table.ownerId, table.sessionId)],
);

export const copilotAttachments = mysqlTable(
  "copilot_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    sessionId: varchar("sessionId", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 160 }).notNull(),
    byteSize: int("byteSize").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
    extractedText: text("extractedText").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("copilot_attachments_owner_session_idx").on(table.ownerId, table.sessionId)],
);

export const workspaceSettings = mysqlTable(
  "workspace_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    key: varchar("key", { length: 120 }).notNull(),
    value: json("value").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("settings_owner_key_idx").on(table.ownerId, table.key)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
