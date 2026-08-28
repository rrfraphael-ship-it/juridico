import { and, desc, eq, gte, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  contracts,
  contractReviewComments,
  contractReviewLinks,
  contractExceptions,
  dealParties,
  dealEvents,
  dealWorkItems,
  deals,
  diligenceAnalyses,
  diligenceItems,
  documents,
  intakes,
  InsertUser,
  legalLibrary,
  notifications,
  obligations,
  signatureEnvelopes,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildPendingActions } from "../shared/dealProgress";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getOwnedDeal(ownerId: number, dealId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.ownerId, ownerId))).limit(1))[0];
}

export async function getDealDetail(ownerId: number, dealId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const deal = await getOwnedDeal(ownerId, dealId);
  if (!deal) return undefined;
  const [dealIntakes, dealContracts, checklist, dealDocuments, dealObligations, parties, analyses, reviewLinks, workItems, events, exceptions, envelopes] = await Promise.all([
    db.select().from(intakes).where(eq(intakes.dealId, dealId)).orderBy(desc(intakes.createdAt)),
    db.select().from(contracts).where(eq(contracts.dealId, dealId)).orderBy(desc(contracts.updatedAt)),
    db.select().from(diligenceItems).where(eq(diligenceItems.dealId, dealId)).orderBy(desc(diligenceItems.createdAt)),
    db.select().from(documents).where(eq(documents.dealId, dealId)).orderBy(desc(documents.uploadedAt)),
    db.select().from(obligations).where(eq(obligations.dealId, dealId)).orderBy(obligations.dueAt),
    db.select().from(dealParties).where(eq(dealParties.dealId, dealId)),
    db.select().from(diligenceAnalyses).where(eq(diligenceAnalyses.dealId, dealId)).orderBy(desc(diligenceAnalyses.updatedAt)),
    db.select().from(contractReviewLinks).where(eq(contractReviewLinks.dealId, dealId)).orderBy(desc(contractReviewLinks.createdAt)),
    db.select().from(dealWorkItems).where(eq(dealWorkItems.dealId, dealId)).orderBy(dealWorkItems.dueAt),
    db.select().from(dealEvents).where(eq(dealEvents.dealId, dealId)).orderBy(desc(dealEvents.createdAt)).limit(80),
    db.select().from(contractExceptions).where(eq(contractExceptions.dealId, dealId)).orderBy(desc(contractExceptions.updatedAt)),
    db.select().from(signatureEnvelopes).where(eq(signatureEnvelopes.dealId, dealId)).orderBy(desc(signatureEnvelopes.updatedAt)),
  ]);
  const reviewIds = new Set(reviewLinks.map(link => link.id));
  const reviewComments = reviewIds.size ? (await db.select().from(contractReviewComments)).filter(comment => reviewIds.has(comment.reviewLinkId)) : [];
  return { deal, intakes: dealIntakes, contracts: dealContracts, checklist, documents: dealDocuments, obligations: dealObligations, parties, analyses, reviewLinks, reviewComments, workItems, events, exceptions, envelopes };
}

export async function recordDealEvent(input: { ownerId: number; dealId: number; type: "intake" | "diligencia" | "documento" | "minuta" | "revisao" | "tarefa" | "excecao" | "assinatura" | "marco" | "sistema"; title: string; detail?: string | null; actorName?: string | null; payload?: unknown; clientVisible?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dealEvents).values({ ownerId: input.ownerId, dealId: input.dealId, type: input.type, title: input.title, detail: input.detail ?? null, actorName: input.actorName ?? null, payload: input.payload ?? null, clientVisible: input.clientVisible ?? false });
}

export async function getDashboard(ownerId: number) {
  const db = await getDb();
  if (!db) return { deals: [], obligations: [], notifications: [] };
  const [activeDeals, upcomingObligations, recentNotifications, unreadPendingActions, allContracts, allDiligenceItems] = await Promise.all([
    db.select().from(deals).where(and(eq(deals.ownerId, ownerId), ne(deals.stage, "archived"))).orderBy(desc(deals.updatedAt)),
    db.select().from(obligations).where(and(eq(obligations.ownerId, ownerId), eq(obligations.status, "pendente"), gte(obligations.dueAt, new Date()))).orderBy(obligations.dueAt).limit(5),
    db.select().from(notifications).where(eq(notifications.ownerId, ownerId)).orderBy(desc(notifications.createdAt)).limit(8),
    db.select().from(notifications).where(and(eq(notifications.ownerId, ownerId), eq(notifications.type, "acao_pendente"), eq(notifications.isRead, false))),
    db.select().from(contracts),
    db.select().from(diligenceItems),
  ]);
  const activeDealIds = new Set(activeDeals.map(deal => deal.id));
  const pendingActions = buildPendingActions({
    deals: activeDeals,
    contracts: allContracts.filter(contract => activeDealIds.has(contract.dealId)),
    diligenceItems: allDiligenceItems.filter(item => activeDealIds.has(item.dealId)),
  });
  const alreadyOpen = new Set(unreadPendingActions.map(item => item.dealId));
  const newActions = pendingActions.filter(item => !alreadyOpen.has(item.dealId));
  if (newActions.length) await db.insert(notifications).values(newActions.map(item => ({ ownerId, dealId: item.dealId, type: "acao_pendente" as const, severity: "atencao" as const, title: item.title, content: item.content, actionPath: item.actionPath })));
  const notificationFeed = newActions.length ? await db.select().from(notifications).where(eq(notifications.ownerId, ownerId)).orderBy(desc(notifications.createdAt)).limit(8) : recentNotifications;
  return { deals: activeDeals, obligations: upcomingObligations, notifications: notificationFeed };
}

export async function getClientPanel(clientToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const deal = (await db.select().from(deals).where(eq(deals.clientToken, clientToken)).limit(1))[0];
  if (!deal) return undefined;
  const [docs, dealContracts, checklist, workItems, publicEvents] = await Promise.all([
    db.select().from(documents).where(and(eq(documents.dealId, deal.id), eq(documents.visibility, "cliente"))).orderBy(desc(documents.uploadedAt)),
    db.select().from(contracts).where(eq(contracts.dealId, deal.id)).orderBy(desc(contracts.updatedAt)),
    db.select().from(diligenceItems).where(eq(diligenceItems.dealId, deal.id)),
    db.select().from(dealWorkItems).where(and(eq(dealWorkItems.dealId, deal.id), eq(dealWorkItems.clientVisible, true))).orderBy(dealWorkItems.dueAt),
    db.select().from(dealEvents).where(and(eq(dealEvents.dealId, deal.id), eq(dealEvents.clientVisible, true))).orderBy(desc(dealEvents.createdAt)).limit(30),
  ]);
  return { deal, documents: docs, contracts: dealContracts, checklist, workItems, events: publicEvents };
}

export async function getLegalSources(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legalLibrary).where(and(eq(legalLibrary.ownerId, ownerId), eq(legalLibrary.active, true))).orderBy(desc(legalLibrary.updatedAt));
}
