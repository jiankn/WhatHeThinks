/**
 * 支付履约：webhook 与支付后主动确认共用，幂等。
 * 标记付费（原子，只有第一次返回 true）→ 生成报告 → 失败则自动全额退款；成功则发邮件。
 */

import { SKUS } from "@/lib/pricing";
import { sendReportEmail } from "./email";
import { generateReport } from "./generate";
import { issueEmailToken, markPaid } from "./reports";
import { refundPaymentIntent, type CheckoutSession } from "./stripe";

export async function fulfillSession(db: D1Database, env: CloudflareEnv, s: CheckoutSession): Promise<"paid" | "unpaid" | "ignored"> {
  const reportId = s.metadata?.reportId;
  if (!reportId) return "ignored";
  if (s.payment_status !== "paid") return "unpaid";

  await db
    .prepare(`UPDATE orders SET status = 'paid' WHERE stripe_session_id = ? AND status = 'pending'`)
    .bind(s.id)
    .run();

  const email = s.customer_details?.email ?? null;
  const first = await markPaid(db, reportId, email);
  if (!first) return "paid";

  await db
    .prepare(`INSERT INTO events (name, report_id, props, ts) VALUES ('paid', ?, ?, ?)`)
    .bind(reportId, JSON.stringify({ sku: s.metadata?.sku ?? SKUS.full_report.sku, cents: s.amount_total }), Date.now())
    .run();

  const ok = await generateReport(db, reportId, env);
  if (!ok) {
    if (s.payment_intent && env.STRIPE_SECRET_KEY) {
      try {
        await refundPaymentIntent(env.STRIPE_SECRET_KEY, s.payment_intent);
        await db.prepare(`UPDATE orders SET status = 'refunded' WHERE stripe_session_id = ?`).bind(s.id).run();
      } catch (err) {
        console.error(JSON.stringify({ evt: "refund_failed", reportId, error: err instanceof Error ? err.message : "unknown" }));
      }
    }
    return "paid";
  }

  if (email) {
    const token = await issueEmailToken(db, reportId);
    await sendReportEmail(env, { to: email, link: `${env.SITE_URL}/r/${reportId}#t=${token}` });
  }
  return "paid";
}
