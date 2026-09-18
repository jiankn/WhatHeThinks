/**
 * POST /api/checkout — 为报告发起支付。
 * - 已付费：直接返回 { unlocked: true }
 * - 配置了 STRIPE_SECRET_KEY：创建 Stripe Checkout Session，返回 { url }
 * - 否则若 DEV_UNLOCK=1：开发模式直接标记付费并生成报告
 * 详见 docs/PRD.md §5.6。
 */

import { nanoid } from "nanoid";
import { SKUS } from "@/lib/pricing";
import { getDB, getEnv } from "@/lib/server/env";
import { generateReport } from "@/lib/server/generate";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { getAuthorizedRow, markPaid } from "@/lib/server/reports";
import { createCheckoutSession } from "@/lib/server/stripe";

export async function POST(req: Request): Promise<Response> {
  let body: { reportId?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("invalid json", 400);
  }
  if (typeof body.reportId !== "string") return error("missing reportId", 400);

  const db = await getDB();
  const row = await getAuthorizedRow(db, body.reportId, req.headers.get(TOKEN_HEADER));
  if (!row) return error("not found", 404);
  if (row.paid_at !== null) return json({ unlocked: true });

  const env = await getEnv();
  if (env.STRIPE_SECRET_KEY) {
    const sku = SKUS.full_report;
    const origin = new URL(req.url).origin;
    try {
      const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
        reportId: row.id,
        sku: sku.sku,
        cents: sku.cents,
        name: sku.name,
        // token 不经过 Stripe：回跳后报告页从 localStorage 读取
        successUrl: `${origin}/r/${row.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/r/${row.id}`,
      });
      await db
        .prepare(`INSERT INTO orders (id, report_id, sku, amount_cents, stripe_session_id, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`)
        .bind(nanoid(12), row.id, sku.sku, sku.cents, session.id, Date.now())
        .run();
      return json({ url: session.url });
    } catch (err) {
      console.error(JSON.stringify({ evt: "checkout_failed", error: err instanceof Error ? err.message : "unknown" }));
      return error("checkout unavailable", 502);
    }
  }

  if (env.DEV_UNLOCK === "1") {
    if (await markPaid(db, row.id, null)) await generateReport(db, row.id);
    return json({ unlocked: true });
  }
  return error("checkout unavailable", 503);
}
