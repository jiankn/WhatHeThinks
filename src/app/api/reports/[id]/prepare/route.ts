/**
 * POST /api/reports/:id/prepare — 免费预览打开后，在付款前把完整报告写好（写好也不返回内容）。
 * 预览页在开头写好后调用，不等待结果；付款后若已写好就直接打开，否则照常生成。
 * 需 x-report-token 头，或已登录且报告属于该账户。
 */

import { getRequestUser } from "@/lib/server/auth";
import { getDB, getEnv } from "@/lib/server/env";
import { hasReportModel, prepareReport } from "@/lib/server/generate";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { countRecentEvents, getAnalysis, getAuthorizedRow, type ReportRow } from "@/lib/server/reports";

type Ctx = { params: Promise<{ id: string }> };

/** 预写完整报告的全站每小时上限；超出后付款时照常生成。 */
const HOURLY_CAP = 150;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return error("invalid origin", 403);
  const { id } = await params;
  const db = await getDB();
  let row: ReportRow | null = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  if (!row) {
    const user = await getRequestUser(req, db);
    row = user ? await db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(id, user.id).first<ReportRow>() : null;
  }
  if (!row || row.paid_at !== null) return error("not found", 404);
  const env = await getEnv();
  const analysis = getAnalysis(row) as ReturnType<typeof getAnalysis> & { teaserFailed?: number };
  // 先等开头写好（或确定写不了），完整报告才能沿用同一个开头
  if (!analysis.teaser && !analysis.teaserFailed) return json({ status: "waiting" });
  if (!hasReportModel(env) || Date.now() - row.created_at > MAX_AGE_MS || (await countRecentEvents(db, "pregen_started", 3_600_000)) >= HOURLY_CAP) {
    return json({ status: "skipped" });
  }
  return json({ status: await prepareReport(db, id, env) });
}
