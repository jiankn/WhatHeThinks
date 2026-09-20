/**
 * POST /api/checkout/confirm — 支付回跳后主动向 Stripe 确认并履约。
 * 本地开发没有 webhook 时也能完成支付；与 webhook 共用幂等的 fulfillSession。
 */

import { getDB, getEnv } from "@/lib/server/env";
import { fulfillSession } from "@/lib/server/fulfill";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { getAuthorizedRow } from "@/lib/server/reports";
import { getCheckoutSession } from "@/lib/server/stripe";
import { getRequestUser } from "@/lib/server/auth";
import type { ReportRow } from "@/lib/server/reports";

export async function POST(req: Request): Promise<Response> {
  let body: { reportId?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("invalid json", 400);
  }
  if (typeof body.reportId !== "string" || typeof body.sessionId !== "string" || !body.sessionId.startsWith("cs_")) {
    return error("invalid request", 400);
  }

  const db = await getDB();
  const rowByToken = await getAuthorizedRow(db, body.reportId, req.headers.get(TOKEN_HEADER));
  const user = rowByToken ? null : await getRequestUser(req, db);
  const row = rowByToken ?? (user
    ? await db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(body.reportId, user.id).first<ReportRow>()
    : null);
  if (!row) return error("not found", 404);
  if (row.paid_at !== null) return json({ status: "paid" });

  const env = await getEnv();
  if (!env.STRIPE_SECRET_KEY) return error("stripe not configured", 503);

  const session = await getCheckoutSession(env.STRIPE_SECRET_KEY, body.sessionId);
  // 会话必须属于这份报告，防止拿别人的付款解锁自己的报告
  if (session.metadata?.reportId !== row.id) return error("session mismatch", 400);
  return json({ status: await fulfillSession(db, env, session) });
}
