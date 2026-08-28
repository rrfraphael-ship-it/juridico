import type { Request, Response } from "express";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { notifications, obligations, workspaceSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

type AlertPreferences = { enabled?: boolean; daysBefore?: number };

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function shouldAlert(dueAt: Date, lastAlertedAt: Date | null, alertDaysBefore: number, today = new Date()) {
  const currentDay = startOfDay(today);
  const dueDay = startOfDay(dueAt);
  const daysUntilDue = Math.ceil((dueDay.getTime() - currentDay.getTime()) / 86_400_000);
  const alreadyAlertedToday = lastAlertedAt ? startOfDay(lastAlertedAt).getTime() === currentDay.getTime() : false;
  return !alreadyAlertedToday && daysUntilDue >= 0 && daysUntilDue <= alertDaysBefore;
}

async function runDueAlertCheck() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível para verificar os alertas.");
  const today = startOfDay(new Date());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);
  const [settings, pending] = await Promise.all([
    db.select().from(workspaceSettings).where(eq(workspaceSettings.key, "alerts")),
    db.select().from(obligations).where(and(eq(obligations.status, "pendente"), gte(obligations.dueAt, today), lte(obligations.dueAt, horizon), or(isNull(obligations.lastAlertedAt), lte(obligations.lastAlertedAt, new Date(today.getTime() - 86_400_000))))),
  ]);
  const preferencesByOwner = new Map<number, AlertPreferences>();
  settings.forEach(setting => preferencesByOwner.set(setting.ownerId, setting.value as AlertPreferences));
  const candidates = pending.filter(item => {
    const preference = preferencesByOwner.get(item.ownerId) ?? { enabled: true, daysBefore: item.alertDaysBefore };
    return preference.enabled !== false && shouldAlert(item.dueAt, item.lastAlertedAt, preference.daysBefore ?? item.alertDaysBefore, today);
  });
  if (!candidates.length) return { alerted: 0, skipped: "No eligible obligations" };
  const content = candidates.map(item => `• ${item.title} — vence em ${item.dueAt.toLocaleDateString("pt-BR")}`).join("\n");
  const delivered = await notifyOwner({ title: `ImobLegal: ${candidates.length} prazo${candidates.length === 1 ? " próximo" : "s próximos"}`, content: `Obrigações que exigem atenção:\n${content}` });
  if (!delivered) throw new Error("O canal de notificações está indisponível.");
  await Promise.all(candidates.flatMap(item => [
    db.update(obligations).set({ lastAlertedAt: new Date() }).where(eq(obligations.id, item.id)),
    db.insert(notifications).values({ ownerId: item.ownerId, dealId: item.dealId, type: "prazo_proximo", severity: "atencao", title: "Prazo próximo", content: `${item.title} vence em ${item.dueAt.toLocaleDateString("pt-BR")}.`, actionPath: "/obrigacoes" }),
  ]));
  return { alerted: candidates.length };
}

export async function handleDueAlerts(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runDueAlertCheck();
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}
