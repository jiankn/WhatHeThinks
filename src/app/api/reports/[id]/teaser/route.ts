/**
 * GET  /api/reports/:id/teaser — 免费预览的钩子：锁住的发现（程序算出、原文打码）+ 已写好的报告开头（只露前一部分）。
 * POST /api/reports/:id/teaser — 还没有开头时写一份（每份报告最多一次，付款前）。
 * 需 x-report-token 头，或已登录且报告属于该账户。不记录任何消息文本。
 */

import { getRequestUser } from "@/lib/server/auth";
import { getDB, getEnv } from "@/lib/server/env";
import { getLlmWriter, hasReportModel } from "@/lib/server/generate";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { claimTeaser, countRecentEvents, getAnalysis, getAuthorizedRow, getEvidence, getReportRow, recordEvent, saveTeaser, type ReportRow } from "@/lib/server/reports";
import { buildTeaserFacts, publicTeaser } from "@/lib/report/story";

type Ctx = { params: Promise<{ id: string }> };

/** 免费开头的全站每小时上限：超出后只显示锁住的发现，防止刷接口烧钱。 */
const HOURLY_CAP = 300;
/** 太旧的预览不再补写开头。 */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

async function authorized(req: Request, db: D1Database, id: string): Promise<ReportRow | null> {
  const byToken = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  if (byToken) return byToken;
  const user = await getRequestUser(req, db);
  return user ? await db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(id, user.id).first<ReportRow>() : null;
}

async function teaserView(db: D1Database, row: ReportRow) {
  const analysis = getAnalysis(row) as ReturnType<typeof getAnalysis> & { teaserPending?: number; teaserFailed?: number };
  const evidence = await getEvidence(db, row.id);
  const status = analysis.teaser ? "ready" : analysis.teaserFailed ? "failed" : (analysis.teaserPending ?? 0) > Date.now() - 120_000 ? "pending" : "none";
  return {
    facts: buildTeaserFacts(analysis, evidence, Date.now()),
    opening: analysis.teaser ? publicTeaser(analysis.teaser) : null,
    status,
  };
}

export async function GET(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const db = await getDB();
  const row = await authorized(req, db, id);
  if (!row || row.paid_at !== null) return error("not found", 404);
  return json(await teaserView(db, row));
}

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return error("invalid origin", 403);
  const { id } = await params;
  const db = await getDB();
  const row = await authorized(req, db, id);
  if (!row || row.paid_at !== null) return error("not found", 404);
  const env = await getEnv();
  const skip = !hasReportModel(env) || Date.now() - row.created_at > MAX_AGE_MS || (await countRecentEvents(db, "teaser_generated", 3_600_000)) >= HOURLY_CAP;
  if (skip) return json({ ...(await teaserView(db, row)), status: "unavailable" });
  // 另一个请求正在写：返回最新状态（pending），页面稍后再取
  if (!(await claimTeaser(db, id))) return json(await teaserView(db, (await getReportRow(db, id)) ?? row));

  try {
    const { teaser, failures } = await getLlmWriter(env).writeTeaser({
      reportId: id, question: row.question, customQuestion: row.custom_question,
      analysis: getAnalysis(row), evidence: await getEvidence(db, id),
    });
    await saveTeaser(db, id, teaser);
    await recordEvent(db, "teaser_generated", id, { model: teaser.model, reasons: failures.slice(0, 30) });
  } catch (err) {
    const reasons = (err as { reasons?: string[] } | null)?.reasons ?? [err instanceof Error ? err.name : "unknown"];
    await saveTeaser(db, id, null);
    await recordEvent(db, "teaser_failed", id, { reasons: reasons.slice(0, 30) });
  }
  return json(await teaserView(db, (await getReportRow(db, id)) ?? row));
}
