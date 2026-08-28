import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  contractTemplates,
  contractReviewComments,
  contractReviewLinks,
  contracts,
  contractExceptions,
  dealParties,
  dealEvents,
  dealWorkItems,
  deals,
  diligenceAnalyses,
  diligenceItems,
  diligenceKits,
  documents,
  intakes,
  copilotAttachments,
  legalLibrary,
  legalMessages,
  notifications,
  obligations,
  proposals,
  proposalBrokerLinks,
  signatureEnvelopes,
  transactionTypes,
  workspaceSettings,
} from "../drizzle/schema";
import { getClientPanel, getDashboard, getDb, getDealDetail, getLegalSources, getOwnedDeal, recordDealEvent } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { buildWordTemplateStorageKey, DOCX_MIME_TYPE, extractDocxText, validateDocxUpload } from "./wordTemplate";
import { buildAttachmentContext, buildMinutaComparisonPrompt, selectMinutasForComparison } from "./copilotAttachments";
import { persistCopilotAttachment } from "./copilotAttachmentService";
import { buildDealFieldsFromIntake, canStoreDiligenceFile, nextContractVersion } from "./legalDomain";
import { buildPartiesFromContractData, contractDataToDealFields, draftContractDataSchema, draftIntakeSubmissionSchema, listMissingContractFields, strictIntakeSubmissionSchema } from "./contractIntake";
import { buildTopicRewritePrompt, parseTopicRewrite } from "./contractTopicAI";
import { analyzeCertificate } from "./certificateAnalysis";
import { buildReviewPath, canWriteToReview, createReviewExpiry, findReusableReviewLink, isAnchoredSelectionValid, isReviewLinkAvailable } from "./contractReviewDomain";
import { buildFinalApprovalNotification, buildReviewCommentSubmission, buildReviewLinkRecord } from "./contractReviewWorkflow";
import { prepareAnchoredCommentAction, prepareFinalApprovalAction } from "./contractReviewActions";
import { buildGuidedTopics, composeGuidedContract, hydrateGuidedTopics, type GuidedTopic, validateGuidedTopics } from "./contractTopics";
import { buildContractDocx, buildContractDocxName } from "./contractDocx";
import { buildContractPdf, buildContractPdfName } from "./contractPdf";
import { buildOperationWorkItems, calculateContractCompleteness, canApproveException, isDossierCategory, kitAppliesToDeal, requiredApprovalLevel } from "./operationsDomain";
import { buildInternalEnvelope } from "./internalSignature";
import { buildProposalDealDraft, canConvertProposal } from "./proposalsDomain";
import { canBrokerEditProposal, isBrokerProposalLinkAvailable } from "./proposalBrokerLinkDomain";
import { DILIGENCE_CATALOG, getCatalogItem } from "../shared/diligenceCatalog";
import { analyzeTemplateTopicApplicability, inferTemplateTopicApplicability } from "./templateTopicApplicability";

const dealStageSchema = z.enum(["intake", "diligence", "draft", "internal_review", "client_review", "signed", "archived"]);
const transactionTypeSchema = z.enum(transactionTypes);
const dateSchema = z.string().datetime().nullable().optional();
const proposalStatusSchema = z.enum(["rascunho", "enviada", "aceita", "recusada", "convertida"]);
const proposalPartySchema = z.object({ role: z.enum(["vendedor", "comprador", "locador", "locatario", "corretor", "parceiro", "outro"]), name: z.string().trim().min(3).max(180), document: z.string().trim().max(40).optional(), email: z.string().trim().email().optional(), phone: z.string().trim().max(40).optional(), commissionAmount: z.number().finite().nonnegative().optional() });
const proposalInputSchema = z.object({ title: z.string().trim().min(3).max(255), transactionType: transactionTypeSchema, propertyAddress: z.string().trim().min(3).max(400), propertyIdentification: z.string().trim().max(1000).optional(), offerAmount: z.number().nonnegative().nullable().optional(), paymentMethod: z.string().trim().max(120).optional(), paymentFlow: z.string().trim().max(5000).optional(), conditions: z.string().trim().max(5000).optional(), expiresAt: dateSchema, recipientName: z.string().trim().max(180).optional(), futureParties: z.array(proposalPartySchema).max(24) });

function assertDb<T>(db: T): asserts db is Exclude<T, null> {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
}

function clientUrl(token: string) {
  return `/cliente/${token}`;
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type DraftDataInput = z.infer<typeof draftIntakeSubmissionSchema>;

async function synchronizeDealDataParties({ db, dealId, contractData }: { db: Database; dealId: number; contractData: z.infer<typeof strictIntakeSubmissionSchema>["contractData"] }) {
  const managedRoles = ["comprador", "vendedor", "locador", "locatario", "parceiro"] as const;
  await db.delete(dealParties).where(and(eq(dealParties.dealId, dealId), inArray(dealParties.role, managedRoles)));
  const parties = buildPartiesFromContractData(contractData);
  if (parties.length) await db.insert(dealParties).values(parties.map(({ role, party }) => ({
    dealId,
    role,
    fullName: party.name,
    documentNumber: party.document,
    email: party.email,
    phone: party.phone,
    commissionAmount: "commissionAmount" in party ? party.commissionAmount : null,
  })));
}

async function persistDealData({ db, intake, input }: { db: Database; intake: typeof intakes.$inferSelect; input: DraftDataInput }) {
  const completed = strictIntakeSubmissionSchema.safeParse(input);
  let dealId = intake.dealId;
  if (completed.success) {
    if (!dealId) {
      const code = `IMB-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
      const inserted = await db.insert(deals).values({ ownerId: intake.ownerId, code, clientToken: nanoid(32), ...contractDataToDealFields(completed.data.contractData) });
      dealId = Number(inserted[0].insertId);
    } else {
      await db.update(deals).set(contractDataToDealFields(completed.data.contractData)).where(eq(deals.id, dealId));
    }
  }
  await db.update(intakes).set({
    dealId,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    payload: input.contractData,
    submittedAt: completed.success ? (intake.submittedAt ?? new Date()) : null,
  }).where(eq(intakes.id, intake.id));
  if (completed.success && dealId) {
    await synchronizeDealDataParties({ db, dealId, contractData: completed.data.contractData });
    if (!intake.submittedAt) {
      await recordDealEvent({ ownerId: intake.ownerId, dealId, type: "intake", title: "Dados do negócio completos", detail: "As informações obrigatórias para a minuta foram preenchidas.", clientVisible: false });
      await db.insert(notifications).values({ ownerId: intake.ownerId, dealId, type: "intake_recebido", severity: "info", title: "Dados do negócio completos", content: "As informações obrigatórias do negócio foram preenchidas.", actionPath: `/negocios/${dealId}` });
      await notifyOwner({ title: "Dados do negócio completos", content: `As informações do negócio ${dealId} foram preenchidas.` });
    }
  }
  return { dealId, isComplete: completed.success };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    get: protectedProcedure.query(async ({ ctx }) => getDashboard(ctx.user.id)),
  }),

  deals: router({
    list: protectedProcedure
      .input(z.object({ archived: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        assertDb(db);
        const archived = input?.archived ?? false;
        return db.select().from(deals).where(and(eq(deals.ownerId, ctx.user.id), archived ? eq(deals.stage, "archived") : ne(deals.stage, "archived"))).orderBy(desc(deals.updatedAt));
      }),
    get: protectedProcedure.input(z.object({ dealId: z.number().int() })).query(async ({ ctx, input }) => {
      const detail = await getDealDetail(ctx.user.id, input.dealId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Negócio não encontrado." });
      return detail;
    }),
    create: protectedProcedure
      .input(z.object({ title: z.string().trim().min(3).max(255), transactionType: transactionTypeSchema, propertyAddress: z.string().trim().min(3), deadline: dateSchema, estimatedValue: z.number().nonnegative().nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        assertDb(db);
        const code = `IMB-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
        const clientToken = nanoid(32);
        const inserted = await db.insert(deals).values({
          ownerId: ctx.user.id,
          code,
          clientToken,
          title: input.title,
          transactionType: input.transactionType,
          propertyAddress: input.propertyAddress,
          deadline: input.deadline ? new Date(input.deadline) : null,
          estimatedValue: input.estimatedValue ?? null,
        });
        const dealId = Number(inserted[0].insertId);
        return { dealId, code, clientUrl: clientUrl(clientToken) };
      }),
    updateStage: protectedProcedure.input(z.object({ dealId: z.number().int(), stage: dealStageSchema })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const deal = await getOwnedDeal(ctx.user.id, input.dealId);
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(deals).set({ stage: input.stage, archivedAt: input.stage === "archived" ? new Date() : null }).where(eq(deals.id, input.dealId));
      return { success: true };
    }),
    archive: protectedProcedure.input(z.object({ dealId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const deal = await getOwnedDeal(ctx.user.id, input.dealId);
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(deals).set({ stage: "archived", archivedAt: new Date() }).where(eq(deals.id, input.dealId));
      return { success: true };
    }),
  }),

  proposals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return db.select().from(proposals).where(eq(proposals.ownerId, ctx.user.id)).orderBy(desc(proposals.updatedAt));
    }),
    get: protectedProcedure.input(z.object({ proposalId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const proposal = (await db.select().from(proposals).where(and(eq(proposals.id, input.proposalId), eq(proposals.ownerId, ctx.user.id))).limit(1))[0];
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
      return proposal;
    }),
    create: protectedProcedure.input(proposalInputSchema).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const code = `PRP-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
      const accessToken = nanoid(32);
      const result = await db.insert(proposals).values({ ownerId: ctx.user.id, code, accessToken, title: input.title, transactionType: input.transactionType, propertyAddress: input.propertyAddress, propertyIdentification: input.propertyIdentification || null, offerAmount: input.offerAmount ?? null, paymentMethod: input.paymentMethod || null, paymentFlow: input.paymentFlow || null, conditions: input.conditions || null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, recipientName: input.recipientName || null, futureParties: input.futureParties });
      return { proposalId: Number(result[0].insertId), code, path: `/proposta/${accessToken}` };
    }),
    update: protectedProcedure.input(proposalInputSchema.extend({ proposalId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const proposal = (await db.select().from(proposals).where(and(eq(proposals.id, input.proposalId), eq(proposals.ownerId, ctx.user.id))).limit(1))[0];
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
      if (proposal.status === "convertida") throw new TRPCError({ code: "CONFLICT", message: "Esta proposta já foi convertida em negócio e não pode mais ser editada." });
      await db.update(proposals).set({ title: input.title, transactionType: input.transactionType, propertyAddress: input.propertyAddress, propertyIdentification: input.propertyIdentification || null, offerAmount: input.offerAmount ?? null, paymentMethod: input.paymentMethod || null, paymentFlow: input.paymentFlow || null, conditions: input.conditions || null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, recipientName: input.recipientName || null, futureParties: input.futureParties, status: "rascunho", respondedBy: null, responseNote: null, respondedAt: null }).where(eq(proposals.id, proposal.id));
      return { success: true };
    }),
    share: protectedProcedure.input(z.object({ proposalId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const proposal = (await db.select().from(proposals).where(and(eq(proposals.id, input.proposalId), eq(proposals.ownerId, ctx.user.id))).limit(1))[0];
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
      if (proposal.status === "convertida") throw new TRPCError({ code: "CONFLICT", message: "A proposta convertida não pode mais ser compartilhada." });
      if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "A validade da proposta expirou. Atualize-a antes de compartilhar." });
      if (proposal.status === "rascunho") await db.update(proposals).set({ status: "enviada" }).where(eq(proposals.id, proposal.id));
      return { path: `/proposta/${proposal.accessToken}` };
    }),
    convertToDeal: protectedProcedure.input(z.object({ proposalId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const proposal = (await db.select().from(proposals).where(and(eq(proposals.id, input.proposalId), eq(proposals.ownerId, ctx.user.id))).limit(1))[0];
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
      if (!canConvertProposal(proposal.status, proposal.dealId)) throw new TRPCError({ code: "CONFLICT", message: proposal.dealId ? "Esta proposta já foi convertida em negócio." : "A proposta precisa estar aceita antes da conversão." });
      const futureParties = z.array(proposalPartySchema).parse(proposal.futureParties);
      const code = `IMB-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
      const clientToken = nanoid(32);
      const created = await db.insert(deals).values({ ownerId: ctx.user.id, code, clientToken, title: proposal.title, transactionType: proposal.transactionType, propertyAddress: proposal.propertyAddress, estimatedValue: proposal.offerAmount, deadline: null });
      const dealId = Number(created[0].insertId);
      await db.insert(intakes).values({ ownerId: ctx.user.id, dealId, token: nanoid(28), source: "operador", payload: buildProposalDealDraft({ transactionType: proposal.transactionType, propertyAddress: proposal.propertyAddress, offerAmount: proposal.offerAmount, paymentMethod: proposal.paymentMethod, paymentFlow: proposal.paymentFlow, conditions: proposal.conditions, futureParties }) });
      const partyRows = futureParties.map(party => ({ dealId, role: party.role, fullName: party.name, documentNumber: party.document || null, email: party.email || null, phone: party.phone || null, commissionAmount: party.commissionAmount ?? null }));
      if (partyRows.length) await db.insert(dealParties).values(partyRows);
      await db.update(proposals).set({ status: "convertida", dealId }).where(eq(proposals.id, proposal.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId, type: "intake", title: "Negócio criado a partir de proposta aceita", detail: `Origem: proposta ${proposal.code}.`, actorName: ctx.user.name ?? null, clientVisible: false });
      return { dealId, path: `/negocios/${dealId}?aba=dados` };
    }),
    createBrokerLink: protectedProcedure.input(z.object({ proposalId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (input.proposalId) {
        const proposal = (await db.select().from(proposals).where(and(eq(proposals.id, input.proposalId), eq(proposals.ownerId, ctx.user.id))).limit(1))[0];
        if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
        if (!canBrokerEditProposal(proposal.status)) throw new TRPCError({ code: "CONFLICT", message: "Somente propostas em rascunho podem ser editadas pelo corretor." });
      }
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await db.insert(proposalBrokerLinks).values({ ownerId: ctx.user.id, proposalId: input.proposalId ?? null, token, expiresAt });
      return { path: `/proposta-corretor/${token}`, expiresAt };
    }),
    getBrokerDraft: publicProcedure.input(z.object({ token: z.string().min(12) })).query(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const link = (await db.select().from(proposalBrokerLinks).where(eq(proposalBrokerLinks.token, input.token)).limit(1))[0];
      if (!link || !isBrokerProposalLinkAvailable(link.expiresAt)) throw new TRPCError({ code: "NOT_FOUND", message: "Este link do corretor não está disponível." });
      const proposal = link.proposalId ? (await db.select().from(proposals).where(and(eq(proposals.id, link.proposalId), eq(proposals.ownerId, link.ownerId))).limit(1))[0] ?? null : null;
      if (proposal && !canBrokerEditProposal(proposal.status)) throw new TRPCError({ code: "CONFLICT", message: "Esta proposta já foi compartilhada ou convertida e não pode mais ser editada pelo corretor." });
      return { expiresAt: link.expiresAt, proposal };
    }),
    saveBrokerDraft: publicProcedure.input(proposalInputSchema.extend({ token: z.string().min(12) })).mutation(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const link = (await db.select().from(proposalBrokerLinks).where(eq(proposalBrokerLinks.token, input.token)).limit(1))[0];
      if (!link || !isBrokerProposalLinkAvailable(link.expiresAt)) throw new TRPCError({ code: "NOT_FOUND", message: "Este link do corretor não está disponível." });
      const values = { title: input.title, transactionType: input.transactionType, propertyAddress: input.propertyAddress, propertyIdentification: input.propertyIdentification || null, offerAmount: input.offerAmount ?? null, paymentMethod: input.paymentMethod || null, paymentFlow: input.paymentFlow || null, conditions: input.conditions || null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, recipientName: input.recipientName || null, futureParties: input.futureParties };
      if (link.proposalId) {
        const proposal = (await db.select().from(proposals).where(and(eq(proposals.id, link.proposalId), eq(proposals.ownerId, link.ownerId))).limit(1))[0];
        if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
        if (!canBrokerEditProposal(proposal.status)) throw new TRPCError({ code: "CONFLICT", message: "Esta proposta já foi compartilhada ou convertida e não pode mais ser editada pelo corretor." });
        await db.update(proposals).set(values).where(eq(proposals.id, proposal.id));
        return { proposalId: proposal.id, created: false };
      }
      const code = `PRP-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
      const result = await db.insert(proposals).values({ ownerId: link.ownerId, code, accessToken: nanoid(32), ...values });
      const proposalId = Number(result[0].insertId);
      await db.update(proposalBrokerLinks).set({ proposalId }).where(eq(proposalBrokerLinks.id, link.id));
      return { proposalId, created: true };
    }),
    getPublic: publicProcedure.input(z.object({ token: z.string().min(12) })).query(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const proposal = (await db.select().from(proposals).where(eq(proposals.accessToken, input.token)).limit(1))[0];
      if (!proposal || (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now())) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de proposta não está disponível." });
      return proposal;
    }),
    respondPublic: publicProcedure.input(z.object({ token: z.string().min(12), status: z.enum(["aceita", "recusada"]), respondedBy: z.string().trim().min(3).max(180), responseNote: z.string().trim().max(3000).optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const proposal = (await db.select().from(proposals).where(eq(proposals.accessToken, input.token)).limit(1))[0];
      if (!proposal || (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now())) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de proposta não está disponível." });
      if (proposal.status !== "enviada") throw new TRPCError({ code: "CONFLICT", message: "Esta proposta não está disponível para manifestação." });
      await db.update(proposals).set({ status: input.status, respondedBy: input.respondedBy, responseNote: input.responseNote || null, respondedAt: new Date() }).where(eq(proposals.id, proposal.id));
      return { success: true };
    }),
  }),

  operations: router({
    bootstrap: protectedProcedure.input(z.object({ dealId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const detail = await getDealDetail(ctx.user.id, input.dealId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = await db.select().from(dealWorkItems).where(eq(dealWorkItems.dealId, input.dealId));
      if (existing.length) return { created: 0 };
      const diligenceComplete = detail.checklist.length > 0 && detail.checklist.every(item => item.status === "aprovado" || item.status === "dispensado");
      const clientReviewApproved = detail.reviewLinks.some(link => Boolean(link.approvedAt));
      const items = buildOperationWorkItems({ ownerId: ctx.user.id, dealId: input.dealId, hasSubmittedIntake: detail.intakes.some(intake => Boolean(intake.submittedAt)), diligenceComplete, hasContract: detail.contracts.length > 0, clientReviewApproved });
      await db.insert(dealWorkItems).values(items);
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "marco", title: "Esteira jurídico-operacional preparada", detail: "Os marcos iniciais do processo foram gerados a partir dos dados disponíveis." });
      return { created: items.length };
    }),
    createWorkItem: protectedProcedure.input(z.object({ dealId: z.number().int(), milestone: z.enum(["intake", "diligencia", "minuta", "revisao", "assinatura", "fechamento"]), title: z.string().trim().min(3).max(255), description: z.string().trim().max(3000).optional(), priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"), blocking: z.boolean().default(false), clientVisible: z.boolean().default(false), dueAt: dateSchema, slaAt: dateSchema, assigneeName: z.string().trim().max(180).optional(), assigneeEmail: z.string().email().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const result = await db.insert(dealWorkItems).values({ ownerId: ctx.user.id, dealId: input.dealId, milestone: input.milestone, title: input.title, description: input.description ?? null, priority: input.priority, blocking: input.blocking, clientVisible: input.clientVisible, dueAt: input.dueAt ? new Date(input.dueAt) : null, slaAt: input.slaAt ? new Date(input.slaAt) : (input.dueAt ? new Date(input.dueAt) : null), assigneeName: input.assigneeName ?? null, assigneeEmail: input.assigneeEmail ?? null });
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "tarefa", title: "Nova ação adicionada à esteira", detail: input.title, actorName: ctx.user.name ?? null, clientVisible: input.clientVisible });
      return { id: Number(result[0].insertId) };
    }),
    updateWorkItem: protectedProcedure.input(z.object({ dealId: z.number().int(), workItemId: z.number().int(), status: z.enum(["pendente", "em_andamento", "bloqueado", "concluido"]), clientVisible: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const item = (await db.select().from(dealWorkItems).where(and(eq(dealWorkItems.id, input.workItemId), eq(dealWorkItems.dealId, input.dealId))).limit(1))[0];
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(dealWorkItems).set({ status: input.status, clientVisible: input.clientVisible ?? item.clientVisible, completedAt: input.status === "concluido" ? new Date() : null }).where(eq(dealWorkItems.id, item.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "tarefa", title: "Ação da esteira atualizada", detail: `${item.title}: ${input.status.replaceAll("_", " ")}`, actorName: ctx.user.name ?? null, clientVisible: input.clientVisible ?? item.clientVisible });
      return { success: true };
    }),
  }),

  intake: router({
    createLink: protectedProcedure
      .input(z.object({ dealId: z.number().int().nullable().optional(), source: z.enum(["corretor", "parceiro", "operador"]).default("corretor") }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        assertDb(db);
        if (input.dealId) {
          const deal = await getOwnedDeal(ctx.user.id, input.dealId);
          if (!deal) throw new TRPCError({ code: "NOT_FOUND" });
        }
        const token = nanoid(28);
        await db.insert(intakes).values({ ownerId: ctx.user.id, dealId: input.dealId ?? null, token, source: input.source });
        return { token, path: `/intake/${token}` };
      }),
    getPublic: publicProcedure.input(z.object({ token: z.string().min(12) })).query(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const intake = (await db.select().from(intakes).where(eq(intakes.token, input.token)).limit(1))[0];
      if (!intake) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de Dados do negócio não está disponível." });
      const deal = intake.dealId ? (await db.select().from(deals).where(eq(deals.id, intake.dealId)).limit(1))[0] : null;
      const savedData = draftContractDataSchema.safeParse(intake.payload);
      return { source: intake.source, dealId: intake.dealId, transactionType: savedData.success ? savedData.data.transactionType : deal?.transactionType ?? "venda", initialData: { contactName: intake.contactName, contactEmail: intake.contactEmail, contactPhone: intake.contactPhone, contractData: intake.payload }, isComplete: Boolean(intake.submittedAt) };
    }),
    getForDeal: protectedProcedure.input(z.object({ dealId: z.number().int() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND", message: "Negócio não encontrado." });
      const records = await db.select().from(intakes).where(eq(intakes.dealId, input.dealId)).orderBy(desc(intakes.createdAt));
      const intake = records.find(item => item.payload) ?? records[0] ?? null;
      return intake ? { id: intake.id, source: intake.source, isComplete: Boolean(intake.submittedAt), initialData: { contactName: intake.contactName, contactEmail: intake.contactEmail, contactPhone: intake.contactPhone, contractData: intake.payload } } : null;
    }),
    saveDraftPublic: publicProcedure.input(draftIntakeSubmissionSchema).mutation(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const intake = (await db.select().from(intakes).where(eq(intakes.token, input.token)).limit(1))[0];
      if (!intake) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de Dados do negócio não está disponível." });
      return persistDealData({ db, intake, input });
    }),
    saveForDeal: protectedProcedure.input(draftIntakeSubmissionSchema.omit({ token: true }).extend({ dealId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND", message: "Negócio não encontrado." });
      const records = await db.select().from(intakes).where(eq(intakes.dealId, input.dealId)).orderBy(desc(intakes.createdAt));
      const intake = records.find(item => item.payload) ?? records[0] ?? (await (async () => {
        const token = nanoid(28);
        const result = await db.insert(intakes).values({ ownerId: ctx.user.id, dealId: input.dealId, token, source: "operador" });
        return (await db.select().from(intakes).where(eq(intakes.id, Number(result[0].insertId))).limit(1))[0];
      })());
      if (!intake) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível preparar os Dados do negócio." });
      return persistDealData({ db, intake, input: { ...input, token: intake.token } });
    }),
    submitPublic: publicProcedure
      .input(strictIntakeSubmissionSchema)
      .mutation(async ({ input }) => {
        const db = await getDb();
        assertDb(db);
        const intake = (await db.select().from(intakes).where(eq(intakes.token, input.token)).limit(1))[0];
        if (!intake) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de Dados do negócio não está disponível." });
        return persistDealData({ db, intake, input });
      }),
  }),

  diligence: router({
    catalog: protectedProcedure.query(() => DILIGENCE_CATALOG),
    configureMunicipalCertificate: protectedProcedure.input(z.object({ dealId: z.number().int(), municipality: z.string().trim().min(2).max(180), issuanceUrl: z.string().trim().url().refine(url => url.startsWith("https://"), "Use uma URL HTTPS oficial.") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = (await db.select().from(diligenceItems).where(and(eq(diligenceItems.dealId, input.dealId), eq(diligenceItems.catalogCode, "municipal_debitos"))).limit(1))[0];
      const title = `Certidão municipal de débitos imobiliários — ${input.municipality}`;
      const notes = `Fonte configurada para ${input.municipality}. Verifique inscrição imobiliária, escopo e validade local antes da emissão.`;
      if (existing) {
        await db.update(diligenceItems).set({ title, issuer: `Prefeitura de ${input.municipality}`, issuanceUrl: input.issuanceUrl, notes, category: "municipal" }).where(eq(diligenceItems.id, existing.id));
        return { itemId: existing.id, updated: true };
      }
      const result = await db.insert(diligenceItems).values({ dealId: input.dealId, catalogCode: "municipal_debitos", category: "municipal", title, issuer: `Prefeitura de ${input.municipality}`, issuanceUrl: input.issuanceUrl, notes });
      return { itemId: Number(result[0].insertId), updated: false };
    }),
    ensureCatalogItem: protectedProcedure.input(z.object({ dealId: z.number().int(), catalogCode: z.string().trim().min(2).max(80), stateCode: z.string().trim().length(2).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const item = getCatalogItem(input.catalogCode, input.stateCode);
      if (!item) throw new TRPCError({ code: "BAD_REQUEST", message: "Ficha de diligência não reconhecida." });
      if (item.requiresState && !input.stateCode) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione a UF para usar esta certidão estadual." });
      const existing = (await db.select().from(diligenceItems).where(and(eq(diligenceItems.dealId, input.dealId), eq(diligenceItems.catalogCode, item.code), input.stateCode ? eq(diligenceItems.stateCode, input.stateCode) : undefined)).limit(1))[0];
      if (existing) return { itemId: existing.id, reused: true };
      const result = await db.insert(diligenceItems).values({ dealId: input.dealId, catalogCode: item.code, category: item.category, title: item.title, issuer: item.issuer, issuanceUrl: item.issuanceUrl ?? null, stateCode: input.stateCode ?? null, notes: item.purpose });
      return { itemId: Number(result[0].insertId), reused: false };
    }),
    addItem: protectedProcedure.input(z.object({ dealId: z.number().int(), title: z.string().trim().min(3), category: z.enum(["federal", "trabalhista", "estadual", "municipal", "registral", "imovel", "outro"]), issuer: z.string().trim().max(180).optional(), notes: z.string().trim().max(2000).optional(), expiresAt: dateSchema })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const result = await db.insert(diligenceItems).values({ dealId: input.dealId, title: input.title, category: input.category, issuer: input.issuer ?? null, notes: input.notes ?? null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null });
      return { id: Number(result[0].insertId) };
    }),
    updateStatus: protectedProcedure.input(z.object({ dealId: z.number().int(), itemId: z.number().int(), status: z.enum(["pendente", "em_revisao", "aprovado", "dispensado"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(diligenceItems).set({ status: input.status }).where(and(eq(diligenceItems.id, input.itemId), eq(diligenceItems.dealId, input.dealId)));
      return { success: true };
    }),
    attach: protectedProcedure.input(z.object({ dealId: z.number().int(), itemId: z.number().int(), fileName: z.string().min(1).max(255), mimeType: z.string().min(3).max(160), dataUrl: z.string().min(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const item = (await db.select().from(diligenceItems).where(and(eq(diligenceItems.id, input.itemId), eq(diligenceItems.dealId, input.dealId))).limit(1))[0];
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item da diligência não encontrado." });
      const encoded = input.dataUrl.split(",")[1];
      if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo inválido." });
      const bytes = Buffer.from(encoded, "base64");
      if (!canStoreDiligenceFile(bytes.byteLength)) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Envie arquivos de até 8 MB." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const stored = await storagePut(`due-diligence/${input.dealId}/${Date.now()}-${safeName}`, bytes, input.mimeType);
      const inserted = await db.insert(documents).values({ dealId: input.dealId, name: input.fileName, kind: "certidao", category: "certidoes", visibility: "cliente", storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType });
      const documentId = Number(inserted[0].insertId);
      await db.update(diligenceItems).set({ attachedDocumentId: documentId, status: "em_revisao" }).where(eq(diligenceItems.id, item.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "documento", title: "Certidão anexada ao dossiê", detail: input.fileName, actorName: ctx.user.name ?? null, clientVisible: true });
      return { documentId, itemId: input.itemId, url: stored.url };
    }),
    attachSupporting: protectedProcedure.input(z.object({ dealId: z.number().int(), category: z.enum(["partes", "municipal", "condominio", "imovel", "outro"]), visibility: z.enum(["interno", "cliente"]).default("interno"), fileName: z.string().min(1).max(255), mimeType: z.string().min(3).max(160), dataUrl: z.string().min(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const encoded = input.dataUrl.split(",")[1];
      if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo inválido." });
      const bytes = Buffer.from(encoded, "base64");
      if (!canStoreDiligenceFile(bytes.byteLength)) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Envie arquivos de até 8 MB." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const stored = await storagePut(`due-diligence/${input.dealId}/complementar-${Date.now()}-${safeName}`, bytes, input.mimeType);
      const inserted = await db.insert(documents).values({ dealId: input.dealId, name: input.fileName, kind: "outro", category: input.category, visibility: input.visibility, storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType });
      const documentId = Number(inserted[0].insertId);
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "documento", title: "Documento complementar anexado", detail: input.fileName, actorName: ctx.user.name ?? null, clientVisible: input.visibility === "cliente" });
      return { documentId, url: stored.url };
    }),
    analyze: protectedProcedure.input(z.object({ dealId: z.number().int(), itemId: z.number().int(), documentId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const [item, document] = await Promise.all([
        db.select().from(diligenceItems).where(and(eq(diligenceItems.id, input.itemId), eq(diligenceItems.dealId, input.dealId))).limit(1),
        db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.dealId, input.dealId))).limit(1),
      ]);
      if (!item[0] || !document[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Certidão ou item de diligência não encontrado." });
      const existing = (await db.select().from(diligenceAnalyses).where(eq(diligenceAnalyses.documentId, input.documentId)).limit(1))[0];
      if (existing) await db.update(diligenceAnalyses).set({ status: "processando", riskLevel: "indeterminado", errorMessage: null }).where(eq(diligenceAnalyses.id, existing.id));
      else await db.insert(diligenceAnalyses).values({ dealId: input.dealId, diligenceItemId: input.itemId, documentId: input.documentId, status: "processando", riskLevel: "indeterminado" });
      try {
        const result = await analyzeCertificate({ storageKey: document[0].storageKey, mimeType: document[0].mimeType, fileName: document[0].name });
        if (!result.supported) {
          await db.update(diligenceAnalyses).set({ status: "nao_suportado", limitations: result.reason, analyzedAt: new Date() }).where(eq(diligenceAnalyses.documentId, input.documentId));
          return { status: "nao_suportado" as const };
        }
        await db.update(diligenceAnalyses).set({ status: "concluida", riskLevel: result.analysis.riskLevel, summary: result.analysis.summary, findings: result.analysis.findings, limitations: result.analysis.limitations, analyzedAt: new Date(), errorMessage: null }).where(eq(diligenceAnalyses.documentId, input.documentId));
        if (result.analysis.riskLevel === "alto" || result.analysis.riskLevel === "moderado") {
          await db.insert(notifications).values({
            ownerId: ctx.user.id,
            dealId: input.dealId,
            type: "risco_documental",
            severity: result.analysis.riskLevel === "alto" ? "critico" : "atencao",
            title: `Risco ${result.analysis.riskLevel} identificado`,
            content: `A leitura assistida encontrou pontos de atenção em ${document[0].name}.`,
            actionPath: `/negocios/${input.dealId}`,
          });
        }
        return { status: "concluida" as const, riskLevel: result.analysis.riskLevel };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível analisar esta certidão.";
        await db.update(diligenceAnalyses).set({ status: "falha", errorMessage: message, analyzedAt: new Date() }).where(eq(diligenceAnalyses.documentId, input.documentId));
        return { status: "falha" as const };
      }
    }),
  }),

  diligenceKits: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return db.select().from(diligenceKits).where(and(eq(diligenceKits.ownerId, ctx.user.id), eq(diligenceKits.active, true))).orderBy(desc(diligenceKits.updatedAt));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(3).max(180), transactionType: transactionTypeSchema, description: z.string().trim().max(2000).optional(), items: z.array(z.object({ title: z.string().trim().min(3).max(255), category: z.enum(["federal", "trabalhista", "estadual", "municipal", "registral", "imovel", "outro"]), issuer: z.string().trim().max(255).optional(), notes: z.string().trim().max(2000).optional(), required: z.boolean().default(true) })).min(1).max(60) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const result = await db.insert(diligenceKits).values({ ownerId: ctx.user.id, name: input.name, transactionType: input.transactionType, description: input.description ?? null, items: input.items });
      return { id: Number(result[0].insertId) };
    }),
    applyKit: protectedProcedure.input(z.object({ dealId: z.number().int(), kitId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const deal = await getOwnedDeal(ctx.user.id, input.dealId);
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" });
      const kit = (await db.select().from(diligenceKits).where(and(eq(diligenceKits.id, input.kitId), eq(diligenceKits.ownerId, ctx.user.id), eq(diligenceKits.active, true))).limit(1))[0];
      if (!kit) throw new TRPCError({ code: "NOT_FOUND", message: "Kit de diligência não encontrado." });
      if (!kitAppliesToDeal(kit.transactionType, deal.transactionType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Este kit não é aplicável ao tipo de operação do negócio." });
      const current = await db.select().from(diligenceItems).where(eq(diligenceItems.dealId, input.dealId));
      const existingTitles = new Set(current.map(item => item.title.trim().toLowerCase()));
      const items = (kit.items as Array<{ title: string; category: "federal" | "trabalhista" | "estadual" | "municipal" | "registral" | "imovel" | "outro"; issuer?: string; notes?: string }>).filter(item => !existingTitles.has(item.title.trim().toLowerCase()));
      if (items.length) await db.insert(diligenceItems).values(items.map(item => ({ dealId: input.dealId, title: item.title, category: item.category, issuer: item.issuer ?? null, notes: item.notes ?? null })));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "diligencia", title: "Kit de diligência aplicado", detail: `${kit.name}: ${items.length} item(ns) adicionados ao checklist.`, actorName: ctx.user.name ?? null, clientVisible: false });
      return { added: items.length };
    }),
  }),

  dossier: router({
    updateDocument: protectedProcedure.input(z.object({ dealId: z.number().int(), documentId: z.number().int(), category: z.enum(["partes", "imovel", "certidoes", "municipal", "condominio", "contrato", "financeiro", "fechamento", "outro"]), visibility: z.enum(["interno", "cliente"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const document = (await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.dealId, input.dealId))).limit(1))[0];
      if (!document) throw new TRPCError({ code: "NOT_FOUND" });
      if (!isDossierCategory(input.category)) throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria documental inválida." });
      await db.update(documents).set({ category: input.category, visibility: input.visibility }).where(eq(documents.id, document.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "documento", title: "Classificação do dossiê atualizada", detail: `${document.name}: ${input.category} · ${input.visibility}`, actorName: ctx.user.name ?? null, clientVisible: input.visibility === "cliente" });
      return { success: true };
    }),
  }),

  exceptions: router({
    create: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int().nullable().optional(), topicId: z.enum(["partes", "objeto", "compromisso", "preco", "posse", "titulo", "comissoes", "cominacoes", "foro_privacidade", "formatacoes"]), title: z.string().trim().min(3).max(255), description: z.string().trim().min(3).max(5000), riskLevel: z.enum(["baixo", "moderado", "alto"]), justification: z.string().trim().max(5000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.contractId) {
        const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
        if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Minuta não encontrada." });
      }
      const result = await db.insert(contractExceptions).values({ ownerId: ctx.user.id, dealId: input.dealId, contractId: input.contractId ?? null, topicId: input.topicId, title: input.title, description: input.description, riskLevel: input.riskLevel, justification: input.justification ?? null, requiredApprovalLevel: requiredApprovalLevel(input.riskLevel) });
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "excecao", title: "Exceção jurídica registrada", detail: `${input.topicId}: ${input.title}`, actorName: ctx.user.name ?? null, clientVisible: false });
      return { id: Number(result[0].insertId) };
    }),
    updateStatus: protectedProcedure.input(z.object({ dealId: z.number().int(), exceptionId: z.number().int(), status: z.enum(["aberta", "aprovada", "rejeitada", "resolvida"]), approverName: z.string().trim().max(180).optional(), approverLevel: z.enum(["operacional", "juridico", "diretoria"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const exception = (await db.select().from(contractExceptions).where(and(eq(contractExceptions.id, input.exceptionId), eq(contractExceptions.dealId, input.dealId))).limit(1))[0];
      if (!exception) throw new TRPCError({ code: "NOT_FOUND" });
      const approved = input.status === "aprovada";
      const level = input.approverLevel ?? "juridico";
      if (approved && !canApproveException(exception.requiredApprovalLevel, level)) throw new TRPCError({ code: "FORBIDDEN", message: `Esta exceção exige aprovação de alçada ${exception.requiredApprovalLevel}.` });
      await db.update(contractExceptions).set({ status: input.status, approverName: approved ? (input.approverName ?? ctx.user.name ?? "Responsável interno") : exception.approverName, approvedByLevel: approved ? level : exception.approvedByLevel, approvedAt: approved ? new Date() : exception.approvedAt }).where(eq(contractExceptions.id, exception.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "excecao", title: "Exceção jurídica atualizada", detail: `${exception.title}: ${input.status}`, actorName: ctx.user.name ?? null, clientVisible: false });
      return { success: true };
    }),
  }),

  signatures: router({
    list: protectedProcedure.input(z.object({ dealId: z.number().int() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      return db.select().from(signatureEnvelopes).where(eq(signatureEnvelopes.dealId, input.dealId)).orderBy(desc(signatureEnvelopes.createdAt));
    }),
    prepareInternalEnvelope: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int(), expiresAt: z.string().datetime().nullable().optional(), signers: z.array(z.object({ name: z.string().trim().min(2).max(180), email: z.string().email(), order: z.number().int().min(1).max(20), role: z.string().trim().max(100).optional() })).min(1).max(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Minuta não encontrada." });
      const topics = Array.isArray(contract.topicData) ? contract.topicData as GuidedTopic[] : [];
      const bytes = await buildContractDocx(contract.title, topics, contract.content);
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      const document = await storagePut(`signature-envelopes/${ctx.user.id}/${input.dealId}/${nanoid(12)}-${buildContractDocxName(contract.title)}`, Buffer.from(bytes), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      await db.insert(documents).values({ dealId: input.dealId, name: buildContractDocxName(contract.title), kind: "assinatura", category: "contrato", visibility: "interno", storageKey: document.key, storageUrl: document.url, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const result = await db.insert(signatureEnvelopes).values(buildInternalEnvelope({ ownerId: ctx.user.id, dealId: input.dealId, contractId: contract.id, signers: input.signers, expiresAt }));
      await db.update(contracts).set({ status: "revisao_cliente" }).where(eq(contracts.id, contract.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "assinatura", title: "Envelope interno preparado", detail: `${input.signers.length} signatário(s) configurado(s); documento gerado no dossiê.`, actorName: ctx.user.name ?? null, clientVisible: true });
      await db.insert(notifications).values({ ownerId: ctx.user.id, dealId: input.dealId, type: "acao_pendente", severity: "info", title: "Envelope interno preparado", content: `A minuta está pronta para a etapa de assinatura com ${input.signers.length} signatário(s).`, actionPath: `/negocios/${input.dealId}` });
      return { id: Number(result[0].insertId), documentUrl: document.url };
    }),
    updateStatus: protectedProcedure.input(z.object({ dealId: z.number().int(), envelopeId: z.number().int(), status: z.enum(["pronto", "enviado", "visualizado", "assinado", "cancelado"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const envelope = (await db.select().from(signatureEnvelopes).where(and(eq(signatureEnvelopes.id, input.envelopeId), eq(signatureEnvelopes.dealId, input.dealId))).limit(1))[0];
      if (!envelope) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(signatureEnvelopes).set({ status: input.status, ...(input.status === "enviado" ? { sentAt: new Date() } : {}), ...(input.status === "assinado" ? { signedAt: new Date() } : {}) }).where(eq(signatureEnvelopes.id, envelope.id));
      await recordDealEvent({ ownerId: ctx.user.id, dealId: input.dealId, type: "assinatura", title: `Envelope interno: ${input.status}`, detail: "Status atualizado manualmente pela operação.", actorName: ctx.user.name ?? null, clientVisible: input.status !== "pronto" });
      return { success: true };
    }),
  }),

  contracts: router({
    getGuidedData: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int().nullable().optional() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const detail = await getDealDetail(ctx.user.id, input.dealId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
      const selectedContract = input.contractId === undefined ? detail.contracts[0] : input.contractId === null ? undefined : detail.contracts.find(contract => contract.id === input.contractId);
      if (typeof input.contractId === "number" && !selectedContract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado neste negócio." });
      const template = selectedContract?.templateId ? (await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, selectedContract.templateId), eq(contractTemplates.ownerId, ctx.user.id))).limit(1))[0] : undefined;
      const availableTemplates = (await db.select({ id: contractTemplates.id, name: contractTemplates.name, contractType: contractTemplates.contractType, transactionType: contractTemplates.transactionType, version: contractTemplates.version, sourceFileName: contractTemplates.sourceFileName, topicApplicability: contractTemplates.topicApplicability, content: contractTemplates.content }).from(contractTemplates).where(and(eq(contractTemplates.ownerId, ctx.user.id), eq(contractTemplates.active, true))).orderBy(desc(contractTemplates.updatedAt))).map(({ content, topicApplicability, ...template }) => ({ ...template, topicApplicability: topicApplicability ?? inferTemplateTopicApplicability(content) }));
      const missingFields = listMissingContractFields(detail.intakes.find(item => item.submittedAt)?.payload, detail.deal.transactionType as "venda" | "locacao" | "outro");
      const freshTopics = buildGuidedTopics(detail, template?.content ?? "");
      const savedTopics = Array.isArray(selectedContract?.topicData) ? selectedContract.topicData as GuidedTopic[] : null;
      const topics = savedTopics ? hydrateGuidedTopics(savedTopics, freshTopics) : freshTopics;
      return { topics, completeness: calculateContractCompleteness(topics, detail.exceptions), missingFields, standardTemplate: template ? { id: template.id, name: template.name, contractType: template.contractType, topicApplicability: template.topicApplicability ?? inferTemplateTopicApplicability(template.content) } : null, availableTemplates: availableTemplates.filter(item => item.transactionType === detail.deal.transactionType || item.transactionType === "outro") };
    }),
    getCompleteness: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int().nullable().optional() })).query(async ({ ctx, input }) => {
      const detail = await getDealDetail(ctx.user.id, input.dealId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
      const selectedContract = input.contractId === undefined ? detail.contracts[0] : input.contractId === null ? undefined : detail.contracts.find(contract => contract.id === input.contractId);
      if (typeof input.contractId === "number" && !selectedContract) throw new TRPCError({ code: "NOT_FOUND" });
      const topics = Array.isArray(selectedContract?.topicData) ? selectedContract.topicData as GuidedTopic[] : buildGuidedTopics(detail);
      return calculateContractCompleteness(topics, detail.exceptions);
    }),
    createGuidedDraft: protectedProcedure.input(z.object({ dealId: z.number().int(), templateId: z.number().int(), title: z.string().trim().min(3).max(180).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const detail = await getDealDetail(ctx.user.id, input.dealId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
      const missingFields = listMissingContractFields(detail.intakes.find(item => item.submittedAt)?.payload, detail.deal.transactionType as "venda" | "locacao" | "outro");
      if (missingFields.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Complete os Dados do negócio antes de elaborar a minuta: ${missingFields.join(", ")}.` });
      const template = (await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, input.templateId), eq(contractTemplates.ownerId, ctx.user.id), eq(contractTemplates.active, true))).limit(1))[0];
      if (!template || (template.transactionType !== detail.deal.transactionType && template.transactionType !== "outro")) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Selecione um modelo padrão compatível com a operação antes de elaborar a minuta." });
      const topics = buildGuidedTopics(detail, template.content);
      const result = await db.insert(contracts).values({ dealId: input.dealId, templateId: template.id, contractType: template.contractType, title: input.title ?? `${template.contractType} — ${detail.deal.title}`, content: composeGuidedContract(topics), topicData: topics, status: "rascunho" });
      await db.update(deals).set({ stage: "draft" }).where(eq(deals.id, input.dealId));
      return { id: Number(result[0].insertId), topics };
    }),
    updateGuidedTopics: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int(), topics: z.array(z.object({ id: z.enum(["partes", "objeto", "compromisso", "preco", "posse", "titulo", "comissoes", "cominacoes", "foro_privacidade", "formatacoes"]), title: z.string().min(1).max(100), content: z.string().min(1).max(15000), baseContent: z.string().min(1).max(15000).optional(), businessContext: z.string().min(1).max(10000).optional(), status: z.enum(["preenchido", "atencao", "pendente"]), sources: z.array(z.string().max(180)).max(30) })).length(10) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      const topics = input.topics as GuidedTopic[];
      try { validateGuidedTopics(topics); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Tópicos inválidos." }); }
      await db.update(contracts).set({ topicData: topics, content: composeGuidedContract(topics), version: nextContractVersion(contract.version) }).where(eq(contracts.id, contract.id));
      return { success: true };
    }),
    rewriteGuidedTopic: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int(), topicId: z.enum(["partes", "objeto", "compromisso", "preco", "posse", "titulo", "comissoes", "cominacoes", "foro_privacidade", "formatacoes"]), operatorNote: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const detail = await getDealDetail(ctx.user.id, input.dealId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
      const missingFields = listMissingContractFields(detail.intakes.find(item => item.submittedAt)?.payload, detail.deal.transactionType as "venda" | "locacao" | "outro");
      if (missingFields.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Complete os Dados do negócio antes de usar a IA: ${missingFields.join(", ")}.` });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Minuta não encontrada." });
      const template = contract.templateId ? (await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, contract.templateId), eq(contractTemplates.ownerId, ctx.user.id))).limit(1))[0] : (await db.select().from(contractTemplates).where(and(eq(contractTemplates.ownerId, ctx.user.id), eq(contractTemplates.transactionType, detail.deal.transactionType))).orderBy(desc(contractTemplates.updatedAt)).limit(1))[0];
      if (!template) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cadastre o contrato padrão deste tipo de transação antes de usar a IA." });
      const freshTopics = buildGuidedTopics(detail, template.content);
      const topics = Array.isArray(contract.topicData) ? hydrateGuidedTopics(contract.topicData as GuidedTopic[], freshTopics) : freshTopics;
      const topic = topics.find(item => item.id === input.topicId);
      if (!topic) throw new TRPCError({ code: "NOT_FOUND", message: "Tópico jurídico não encontrado." });
      const diligenceSummary = detail.analyses.map(item => item.summary).filter((item): item is string => Boolean(item)).join("\n");
      try {
        const response = await invokeLLM({ messages: [{ role: "system", content: "Você produz somente sugestões de redação jurídica contratual estruturada em JSON. A sugestão nunca substitui a minuta sem decisão do operador." }, { role: "user", content: buildTopicRewritePrompt({ topic, operatorNote: input.operatorNote, diligenceSummary }) }], responseFormat: { type: "json_object" }, maxTokens: 2200 });
        const content = response.choices[0]?.message.content;
        const raw = typeof content === "string" ? content : "";
        const suggestion = parseTopicRewrite(raw, topic);
        return { suggestion, topicId: input.topicId };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Não foi possível reelaborar o tópico com IA." });
      }
    }),
    exportDocx: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      const topics = Array.isArray(contract.topicData) ? contract.topicData as GuidedTopic[] : [];
      const fileName = buildContractDocxName(contract.title);
      const bytes = await buildContractDocx(contract.title, topics, contract.content);
      const stored = await storagePut(`contract-exports/${input.dealId}/${Date.now()}-${fileName}`, bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      return { fileName, url: stored.url };
    }),
    exportPdf: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      const topics = Array.isArray(contract.topicData) ? contract.topicData as GuidedTopic[] : [];
      const fileName = buildContractPdfName(contract.title);
      const bytes = await buildContractPdf(contract.title, topics, contract.content);
      const stored = await storagePut(`contract-exports/${input.dealId}/${Date.now()}-${fileName}`, bytes, "application/pdf");
      return { fileName, url: stored.url };
    }),
    create: protectedProcedure.input(z.object({ dealId: z.number().int(), templateId: z.number().int(), title: z.string().trim().min(3), content: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const template = (await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, input.templateId), eq(contractTemplates.ownerId, ctx.user.id))).limit(1))[0];
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado." });
      const result = await db.insert(contracts).values({ dealId: input.dealId, templateId: input.templateId, contractType: template.contractType, title: input.title, content: input.content });
      await db.update(deals).set({ stage: "draft" }).where(eq(deals.id, input.dealId));
      return { id: Number(result[0].insertId) };
    }),
    update: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int(), content: z.string().min(1), status: z.enum(["rascunho", "revisao_interna", "revisao_cliente", "finalizado"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Minuta não encontrada." });
      await db.update(contracts).set({ content: input.content, status: input.status, version: nextContractVersion(contract.version) }).where(eq(contracts.id, contract.id));
      return { success: true };
    }),
    createReviewLink: protectedProcedure.input(z.object({ dealId: z.number().int(), contractId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const contract = (await db.select().from(contracts).where(and(eq(contracts.id, input.contractId), eq(contracts.dealId, input.dealId))).limit(1))[0];
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Minuta não encontrada." });
      const currentLinks = await db.select().from(contractReviewLinks).where(and(eq(contractReviewLinks.contractId, contract.id), eq(contractReviewLinks.status, "ativo")));
      const reusable = findReusableReviewLink(currentLinks, contract.version);
      if (reusable) return { path: buildReviewPath(reusable.token), expiresAt: reusable.expiresAt, reused: true };
      const expiresAt = createReviewExpiry();
      const token = nanoid(36);
      await db.insert(contractReviewLinks).values(buildReviewLinkRecord({ ownerId: ctx.user.id, dealId: input.dealId, contractId: contract.id, contractVersion: contract.version, title: contract.title, content: contract.content, token, expiresAt }));
      await db.update(contracts).set({ status: "revisao_cliente" }).where(eq(contracts.id, contract.id));
      return { path: buildReviewPath(token), expiresAt, reused: false };
    }),
  }),

  contractReview: router({
    getPublic: publicProcedure.input(z.object({ token: z.string().min(20).max(64) })).query(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const review = (await db.select().from(contractReviewLinks).where(eq(contractReviewLinks.token, input.token)).limit(1))[0];
      if (!review || !isReviewLinkAvailable(review)) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de revisão não está disponível." });
      const comments = await db.select().from(contractReviewComments).where(eq(contractReviewComments.reviewLinkId, review.id)).orderBy(desc(contractReviewComments.createdAt));
      return { review, comments };
    }),
    addCommentPublic: publicProcedure.input(z.object({ token: z.string().min(20).max(64), authorName: z.string().trim().min(2).max(180), content: z.string().trim().min(3).max(5000), selectedText: z.string().trim().min(1).max(5000).nullable().optional(), selectionStart: z.number().int().min(0).nullable().optional(), selectionEnd: z.number().int().min(0).nullable().optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const review = (await db.select().from(contractReviewLinks).where(eq(contractReviewLinks.token, input.token)).limit(1))[0];
      if (!review || !isReviewLinkAvailable(review)) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de revisão não está disponível." });
      let submission;
      try { submission = prepareAnchoredCommentAction(review, input); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível registrar o comentário." }); }
      const inserted = await db.insert(contractReviewComments).values(submission.comment);
      await db.update(contractReviewLinks).set({ status: "enviado" }).where(eq(contractReviewLinks.id, review.id));
      await db.insert(notifications).values(submission.notification);
      return { id: Number(inserted[0].insertId) };
    }),
    approvePublic: publicProcedure.input(z.object({ token: z.string().min(20).max(64), authorName: z.string().trim().min(2).max(180), approvalNote: z.string().trim().max(2000).optional(), confirmed: z.literal(true) })).mutation(async ({ input }) => {
      const db = await getDb();
      assertDb(db);
      const review = (await db.select().from(contractReviewLinks).where(eq(contractReviewLinks.token, input.token)).limit(1))[0];
      if (!review || !isReviewLinkAvailable(review)) throw new TRPCError({ code: "NOT_FOUND", message: "Este link de revisão não está disponível." });
      let approval;
      try { approval = prepareFinalApprovalAction(review, input); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível aprovar a minuta." }); }
      await db.update(contractReviewLinks).set(approval.reviewUpdate).where(eq(contractReviewLinks.id, review.id));
      await db.update(contracts).set({ status: "finalizado" }).where(eq(contracts.id, review.contractId));
      await db.insert(notifications).values(approval.notification);
      return { success: true };
    }),
    resolveComment: protectedProcedure.input(z.object({ dealId: z.number().int(), commentId: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const comment = (await db.select().from(contractReviewComments).where(eq(contractReviewComments.id, input.commentId)).limit(1))[0];
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
      const review = (await db.select().from(contractReviewLinks).where(and(eq(contractReviewLinks.id, comment.reviewLinkId), eq(contractReviewLinks.dealId, input.dealId))).limit(1))[0];
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(contractReviewComments).set({ status: "resolvido" }).where(eq(contractReviewComments.id, comment.id));
      return { success: true };
    }),
  }),

  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return db.select().from(contractTemplates).where(eq(contractTemplates.ownerId, ctx.user.id)).orderBy(desc(contractTemplates.updatedAt));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(3), contractType: z.string().trim().min(3).max(120), transactionType: transactionTypeSchema, content: z.string().trim().max(120000).optional(), fields: z.array(z.string().min(1)).max(60), sourceFileName: z.string().trim().min(1).max(255).optional(), sourceFileMimeType: z.string().trim().min(1).max(160).optional(), sourceFileDataUrl: z.string().min(20).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const fileFieldsProvided = Boolean(input.sourceFileName || input.sourceFileMimeType || input.sourceFileDataUrl);
      if (fileFieldsProvided && (!input.sourceFileName || !input.sourceFileMimeType || !input.sourceFileDataUrl)) throw new TRPCError({ code: "BAD_REQUEST", message: "O arquivo Word não foi enviado corretamente." });
      let content = input.content ?? "";
      let sourceFileName: string | null = null;
      let sourceFileKey: string | null = null;
      let sourceFileUrl: string | null = null;
      let sourceFileMimeType: string | null = null;
      if (input.sourceFileName && input.sourceFileMimeType && input.sourceFileDataUrl) {
        const encoded = input.sourceFileDataUrl.split(",")[1];
        if (!encoded) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível ler o arquivo Word selecionado." });
        const bytes = Buffer.from(encoded, "base64");
        try { validateDocxUpload(input.sourceFileName, input.sourceFileMimeType, bytes); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Arquivo Word inválido." }); }
        try { const extracted = await extractDocxText(bytes); if (!content) content = extracted; } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível ler o conteúdo deste arquivo DOCX." }); }
        const stored = await storagePut(buildWordTemplateStorageKey(ctx.user.id, input.sourceFileName), bytes, DOCX_MIME_TYPE);
        sourceFileName = input.sourceFileName;
        sourceFileKey = stored.key;
        sourceFileUrl = stored.url;
        sourceFileMimeType = DOCX_MIME_TYPE;
      }
      if (content.trim().length < 20) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe um conteúdo de minuta ou envie um DOCX com texto extraível." });
      const topicApplicability = await analyzeTemplateTopicApplicability(content);
      const result = await db.insert(contractTemplates).values({ ownerId: ctx.user.id, name: input.name, contractType: input.contractType, transactionType: input.transactionType, content, fields: input.fields, topicApplicability, sourceFileName, sourceFileKey, sourceFileUrl, sourceFileMimeType });
      return { id: Number(result[0].insertId) };
    }),
  }),

  obligations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return db.select({ obligation: obligations, deal: deals }).from(obligations).innerJoin(deals, eq(obligations.dealId, deals.id)).where(eq(obligations.ownerId, ctx.user.id)).orderBy(obligations.dueAt);
    }),
    create: protectedProcedure.input(z.object({ dealId: z.number().int(), title: z.string().trim().min(3), description: z.string().trim().max(3000).optional(), dueAt: z.string().datetime(), alertDaysBefore: z.number().int().min(0).max(30).default(3) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      if (!(await getOwnedDeal(ctx.user.id, input.dealId))) throw new TRPCError({ code: "NOT_FOUND" });
      const result = await db.insert(obligations).values({ ownerId: ctx.user.id, dealId: input.dealId, title: input.title, description: input.description ?? null, dueAt: new Date(input.dueAt), alertDaysBefore: input.alertDaysBefore });
      return { id: Number(result[0].insertId) };
    }),
    complete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      await db.update(obligations).set({ status: "concluida", completedAt: new Date() }).where(and(eq(obligations.id, input.id), eq(obligations.ownerId, ctx.user.id)));
      return { success: true };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return db.select().from(notifications).where(eq(notifications.ownerId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(30);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, input.id), eq(notifications.ownerId, ctx.user.id)));
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.ownerId, ctx.user.id));
      return { success: true };
    }),
  }),

  library: router({
    list: protectedProcedure.query(async ({ ctx }) => getLegalSources(ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().trim().min(3), category: z.enum(["legislacao", "jurisprudencia", "clausula", "procedimento", "nota"]), content: z.string().trim().min(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const result = await db.insert(legalLibrary).values({ ownerId: ctx.user.id, title: input.title, category: input.category, content: input.content });
      return { id: Number(result[0].insertId) };
    }),
  }),

  copiloto: router({
    listAttachments: protectedProcedure.input(z.object({ sessionId: z.string().min(4).max(64) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      return db.select({ id: copilotAttachments.id, name: copilotAttachments.name, mimeType: copilotAttachments.mimeType, byteSize: copilotAttachments.byteSize, createdAt: copilotAttachments.createdAt }).from(copilotAttachments).where(and(eq(copilotAttachments.ownerId, ctx.user.id), eq(copilotAttachments.sessionId, input.sessionId))).orderBy(desc(copilotAttachments.createdAt));
    }),
    uploadAttachment: protectedProcedure.input(z.object({ sessionId: z.string().min(4).max(64), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().max(160), dataBase64: z.string().min(4).max(14_000_000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const bytes = Buffer.from(input.dataBase64, "base64");
      try {
        return await persistCopilotAttachment({ ownerId: ctx.user.id, sessionId: input.sessionId, fileName: input.fileName, mimeType: input.mimeType, bytes }, { put: storagePut, create: async record => { const result = await db.insert(copilotAttachments).values(record); return Number(result[0].insertId); } });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível preparar o arquivo para análise." });
      }
    }),
    chat: protectedProcedure.input(z.object({ agent: z.enum(["venda", "locacao", "diligencia", "comparador"]), sessionId: z.string().min(4).max(64), message: z.string().trim().min(2).max(8000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const sources = await getLegalSources(ctx.user.id);
      const sourceContext = sources.length ? sources.slice(0, 12).map(source => `## ${source.title} (${source.category})\n${source.content}`).join("\n\n") : "A biblioteca jurídica ainda não possui fontes cadastradas.";
      const attachments = await db.select({ name: copilotAttachments.name, extractedText: copilotAttachments.extractedText }).from(copilotAttachments).where(and(eq(copilotAttachments.ownerId, ctx.user.id), eq(copilotAttachments.sessionId, input.sessionId))).orderBy(desc(copilotAttachments.createdAt)).limit(4);
      const agentInstruction = {
        venda: "Você é especialista em contratos e operações de compra e venda imobiliária.",
        locacao: "Você é especialista em locação imobiliária e seus instrumentos contratuais.",
        diligencia: "Você é especialista em due diligence imobiliária, certidões e riscos documentais.",
        comparador: "Você é especialista em comparação técnica de minutas imobiliárias. Diferencie alterações textuais, operacionais e pontos que exigem revisão jurídica humana.",
      }[input.agent];
      const system = `${agentInstruction}\n\nResponda em português do Brasil, com raciocínio claro, objetivo e estruturado. Use apenas a biblioteca configurada e os anexos desta conversa como fonte interna; se estiverem incompletos, declare a limitação e recomende revisão humana. Não invente legislação, jurisprudência ou fatos. Você não substitui a análise de um advogado responsável e deve sinalizar riscos, premissas e próximos passos.\n\nBIBLIOTECA JURÍDICA CONFIGURADA:\n${sourceContext}\n\nANEXOS DA CONVERSA:\n${buildAttachmentContext(attachments)}`;
      await db.insert(legalMessages).values({ ownerId: ctx.user.id, sessionId: input.sessionId, agent: input.agent, role: "user", content: input.message });
      const response = await invokeLLM({ messages: [{ role: "system", content: system }, { role: "user", content: input.message }] });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "Não foi possível gerar a orientação neste momento.";
      await db.insert(legalMessages).values({ ownerId: ctx.user.id, sessionId: input.sessionId, agent: input.agent, role: "assistant", content });
      return { content };
    }),
    compareMinutas: protectedProcedure.input(z.object({ sessionId: z.string().min(4).max(64), firstAttachmentId: z.number().int().positive(), secondAttachmentId: z.number().int().positive() }).refine(input => input.firstAttachmentId !== input.secondAttachmentId, { message: "Selecione duas minutas diferentes para comparar." })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const files = await db.select({ id: copilotAttachments.id, name: copilotAttachments.name, extractedText: copilotAttachments.extractedText }).from(copilotAttachments).where(and(eq(copilotAttachments.ownerId, ctx.user.id), eq(copilotAttachments.sessionId, input.sessionId), inArray(copilotAttachments.id, [input.firstAttachmentId, input.secondAttachmentId])));
      let first: (typeof files)[number];
      let second: (typeof files)[number];
      try { ({ first, second } = selectMinutasForComparison(files, input.firstAttachmentId, input.secondAttachmentId)); } catch (error) { throw new TRPCError({ code: input.firstAttachmentId === input.secondAttachmentId ? "BAD_REQUEST" : "NOT_FOUND", message: error instanceof Error ? error.message : "Seleção de minutas inválida." }); }
      const prompt = buildMinutaComparisonPrompt(first, second);
      await db.insert(legalMessages).values({ ownerId: ctx.user.id, sessionId: input.sessionId, agent: "comparador", role: "user", content: `Comparar minutas: ${first.name} × ${second.name}` });
      const response = await invokeLLM({ messages: [{ role: "system", content: "Você é o Comparador de Minutas do ImobLegal. Compare somente os documentos fornecidos, cite os nomes dos arquivos e destaque alterações relevantes em Markdown. Nunca conclua validade jurídica nem substitua a revisão humana." }, { role: "user", content: prompt }], max_tokens: 2600 });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "Não foi possível gerar a comparação neste momento.";
      await db.insert(legalMessages).values({ ownerId: ctx.user.id, sessionId: input.sessionId, agent: "comparador", role: "assistant", content });
      return { content };
    }),
  }),

  clientPanel: router({
    get: publicProcedure.input(z.object({ token: z.string().min(12) })).query(async ({ input }) => {
      const panel = await getClientPanel(input.token);
      if (!panel) throw new TRPCError({ code: "NOT_FOUND", message: "Painel do cliente não encontrado." });
      return panel;
    }),
  }),

  settings: router({
    getAccesses: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return (await db.select().from(workspaceSettings).where(and(eq(workspaceSettings.ownerId, ctx.user.id), eq(workspaceSettings.key, "accesses"))).limit(1))[0] ?? null;
    }),
    saveAccesses: protectedProcedure.input(z.object({ members: z.array(z.object({ name: z.string().trim().min(2), email: z.string().email(), role: z.enum(["administrador", "operador", "leitor"]) })).max(100) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const current = (await db.select().from(workspaceSettings).where(and(eq(workspaceSettings.ownerId, ctx.user.id), eq(workspaceSettings.key, "accesses"))).limit(1))[0];
      if (current) await db.update(workspaceSettings).set({ value: input }).where(eq(workspaceSettings.id, current.id));
      else await db.insert(workspaceSettings).values({ ownerId: ctx.user.id, key: "accesses", value: input });
      return { success: true };
    }),
    getIntegrations: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return (await db.select().from(workspaceSettings).where(and(eq(workspaceSettings.ownerId, ctx.user.id), eq(workspaceSettings.key, "integrations"))).limit(1))[0] ?? null;
    }),
    saveIntegrations: protectedProcedure.input(z.object({ integrations: z.array(z.object({ name: z.string().trim().min(2), category: z.enum(["assinatura", "certidoes", "conector"]), enabled: z.boolean() })).max(30) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const current = (await db.select().from(workspaceSettings).where(and(eq(workspaceSettings.ownerId, ctx.user.id), eq(workspaceSettings.key, "integrations"))).limit(1))[0];
      if (current) await db.update(workspaceSettings).set({ value: input }).where(eq(workspaceSettings.id, current.id));
      else await db.insert(workspaceSettings).values({ ownerId: ctx.user.id, key: "integrations", value: input });
      return { success: true };
    }),
    getAlerts: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDb(db);
      return (await db.select().from(workspaceSettings).where(and(eq(workspaceSettings.ownerId, ctx.user.id), eq(workspaceSettings.key, "alerts"))).limit(1))[0] ?? null;
    }),
    saveAlerts: protectedProcedure.input(z.object({ enabled: z.boolean(), daysBefore: z.number().int().min(0).max(30) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDb(db);
      const current = (await db.select().from(workspaceSettings).where(and(eq(workspaceSettings.ownerId, ctx.user.id), eq(workspaceSettings.key, "alerts"))).limit(1))[0];
      if (current) await db.update(workspaceSettings).set({ value: input }).where(eq(workspaceSettings.id, current.id));
      else await db.insert(workspaceSettings).values({ ownerId: ctx.user.id, key: "alerts", value: input });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
