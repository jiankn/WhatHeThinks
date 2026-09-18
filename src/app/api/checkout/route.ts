/**
 * POST /api/checkout — 为报告发起支付。
 * - 已付费：直接返回 { unlocked: true }
 * - 配置了 STRIPE_SECRET_KEY：创建 Stripe Checkout Session，返回 { url }（M5）
 * - 否则若 DEV_UNLOCK=1：开发模式直接标记付费并生成报告
 * 详见 docs/PRD.md §5.6。
 */

import { getDB, getEnv } from "@/lib/server/env";
import { generateReport } from "@/lib/server/generate";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { getAuthorizedRow, markPaid } from "@/lib/server/reports";

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
  if (env.DEV_UNLOCK === "1" && !env.STRIPE_SECRET_KEY) {
    if (await markPaid(db, row.id, null)) await generateReport(db, row.id);
    return json({ unlocked: true });
  }
  return error("checkout unavailable", 503);
}
