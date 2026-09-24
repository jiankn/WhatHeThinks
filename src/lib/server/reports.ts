/**
 * 报告的 D1 读写。详见 docs/PRD.md §5.7、§6。
 */

import { nanoid } from "nanoid";
import type { EvidenceMsg, Preview } from "@/lib/analysis/analysis-types";
import type { ReportUpload, SlimAnalysis } from "@/lib/report/payload";
import type { FullReport, StoryTeaser } from "@/lib/report/types";
import type { ReportStatus, ReportView } from "@/lib/report/view";
import type { QuestionId } from "@/lib/questions";
import { newToken, safeEqual, sha256Hex } from "./crypto";

const EVIDENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ReportRow {
  id: string;
  token_hash: string;
  alt_token_hash: string | null;
  question: QuestionId;
  custom_question: string | null;
  status: ReportStatus;
  preview_json: string;
  analysis_json: string;
  report_json: string | null;
  email: string | null;
  created_at: number;
  paid_at: number | null;
  evidence_expires_at: number;
  user_id: string | null;
}

export async function createReport(
  db: D1Database,
  upload: ReportUpload,
  userId: string | null = null,
): Promise<{ id: string; token: string }> {
  const id = nanoid(12);
  const token = newToken();
  const now = Date.now();
  // 预览开头只能由服务器写入，上传里带的丢弃
  const { preview, teaser: _teaser, ...analysisRest } = upload.analysis;

  const stmts = [
    db
      .prepare(
        `INSERT INTO reports (id, token_hash, question, custom_question, status, preview_json, analysis_json, created_at, evidence_expires_at, user_id)
         VALUES (?, ?, ?, ?, 'preview', ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        await sha256Hex(token),
        upload.question,
        upload.customQuestion ?? null,
        JSON.stringify(preview),
        JSON.stringify(analysisRest),
        now,
        now + EVIDENCE_TTL_MS,
        userId,
      ),
    ...upload.evidence.map((e) =>
      db
        .prepare(`INSERT INTO evidence (report_id, msg_id, ts, sender, text) VALUES (?, ?, ?, ?, ?)`)
        .bind(id, e.id, e.ts, e.sender, e.text),
    ),
  ];
  await db.batch(stmts);
  await purgeExpiredEvidence(db, now);
  return { id, token };
}

/** 顺带清理过期证据（替代定时任务）。 */
async function purgeExpiredEvidence(db: D1Database, now: number): Promise<void> {
  await db
    .prepare(
      `DELETE FROM evidence WHERE report_id IN (SELECT id FROM reports WHERE evidence_expires_at < ?)`,
    )
    .bind(now)
    .run();
}

export async function getReportRow(db: D1Database, id: string): Promise<ReportRow | null> {
  return db.prepare(`SELECT * FROM reports WHERE id = ?`).bind(id).first<ReportRow>();
}

/** 接受创建时的 token，或付款后邮件里的第二个 token。 */
export async function checkToken(row: ReportRow, token: string | null): Promise<boolean> {
  if (!token) return false;
  const h = await sha256Hex(token);
  return safeEqual(h, row.token_hash) || (row.alt_token_hash !== null && safeEqual(h, row.alt_token_hash));
}

/**
 * 把报告归到账户下。调用方必须先证明有权访问这份报告（报告 token 或已归属该账户）；
 * 已归属其他账户的报告不会被改。
 */
export async function attachReportToUser(db: D1Database, id: string, userId: string): Promise<boolean> {
  const result = await db.prepare(`UPDATE reports SET user_id = ? WHERE id = ? AND user_id IS NULL`).bind(userId, id).run();
  return (result.meta?.changes ?? 0) > 0;
}

/** 生成邮件链接用的第二个 token，只存哈希。 */
export async function issueEmailToken(db: D1Database, id: string): Promise<string> {
  const token = newToken();
  await db.prepare(`UPDATE reports SET alt_token_hash = ? WHERE id = ?`).bind(await sha256Hex(token), id).run();
  return token;
}

/** 按 id + token 取报告；不存在或 token 不符都返回 null（不区分，避免枚举）。 */
export async function getAuthorizedRow(
  db: D1Database,
  id: string,
  token: string | null,
): Promise<ReportRow | null> {
  if (!/^[\w-]{12}$/.test(id)) return null;
  const row = await getReportRow(db, id);
  if (!row || !(await checkToken(row, token))) return null;
  return row;
}

export async function getEvidence(db: D1Database, id: string): Promise<EvidenceMsg[]> {
  const { results } = await db
    .prepare(`SELECT msg_id, ts, sender, text FROM evidence WHERE report_id = ? ORDER BY ts`)
    .bind(id)
    .all<{ msg_id: number; ts: number; sender: "Y" | "H"; text: string }>();
  return results.map((r) => ({ id: r.msg_id, ts: r.ts, sender: r.sender, text: r.text }));
}

export function getAnalysis(row: ReportRow): SlimAnalysis {
  return { ...JSON.parse(row.analysis_json), preview: JSON.parse(row.preview_json) };
}

/** 构建对外视图：付费前只含 preview。 */
export async function toView(db: D1Database, row: ReportRow): Promise<ReportView> {
  const paid = row.paid_at !== null;
  const view: ReportView = {
    id: row.id,
    status: row.status,
    paid,
    question: row.question,
    customQuestion: row.custom_question,
    createdAt: row.created_at,
    preview: JSON.parse(row.preview_json) as Preview,
  };
  if (paid) {
    view.evidence = await getEvidence(db, row.id);
    if (row.status === "ready" && row.report_json) {
      view.report = JSON.parse(row.report_json) as FullReport;
    }
  }
  return view;
}

/** 付费前修改报告侧重点。已付费返回 false（报告已按原侧重点生成）。 */
export async function setFocus(
  db: D1Database,
  id: string,
  question: QuestionId,
  customQuestion: string | null,
): Promise<boolean> {
  const r = await db
    .prepare(`UPDATE reports SET question = ?, custom_question = ? WHERE id = ? AND paid_at IS NULL`)
    .bind(question, customQuestion, id)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** 记录内部事件（只放计数、状态码、规则编号，不放消息文本）；写失败不影响主流程。 */
export async function recordEvent(db: D1Database, name: string, reportId: string, props: object): Promise<void> {
  await db
    .prepare(`INSERT INTO events (name, report_id, props, ts) VALUES (?, ?, ?, ?)`)
    .bind(name, reportId, JSON.stringify(props), Date.now())
    .run()
    .catch(() => {});
}

export async function setStatus(db: D1Database, id: string, status: ReportStatus): Promise<void> {
  await db.prepare(`UPDATE reports SET status = ? WHERE id = ?`).bind(status, id).run();
}

export async function saveReport(db: D1Database, id: string, report: FullReport): Promise<void> {
  await db
    .prepare(`UPDATE reports SET report_json = ?, status = 'ready' WHERE id = ?`)
    .bind(JSON.stringify(report), id)
    .run();
}

/** 标记已付费。已付费则不重复更新（webhook 可能重放）。返回是否本次首次标记。 */
export async function markPaid(db: D1Database, id: string, email: string | null): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE reports SET paid_at = ?, email = COALESCE(?, email), status = 'generating'
       WHERE id = ? AND paid_at IS NULL`,
    )
    .bind(Date.now(), email, id)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** 硬删除报告与证据。订单只保留金额/时间/Stripe id 用于记账。 */
export async function deleteReport(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM report_shares WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM evidence WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM followups WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM events WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM reports WHERE id = ?`).bind(id),
  ]);
}

// ── 免费预览开头 ────────────────────────────────────────────

/** 正在写开头的标记超过这么久视为失败，允许重试。 */
const TEASER_CLAIM_MS = 120_000;

/** 抢占写开头的资格，防止同一份报告被并发重复生成。成功返回 true。 */
export async function claimTeaser(db: D1Database, id: string, now = Date.now()): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE reports SET analysis_json = json_set(analysis_json, '$.teaserPending', ?)
     WHERE id = ? AND paid_at IS NULL AND json_extract(analysis_json, '$.teaser') IS NULL
       AND json_extract(analysis_json, '$.teaserFailed') IS NULL
       AND COALESCE(json_extract(analysis_json, '$.teaserPending'), 0) < ?`,
  ).bind(now, id, now - TEASER_CLAIM_MS).run();
  return (result.meta?.changes ?? 0) > 0;
}

/** 保存写好的开头；传 null 表示失败，记下后不再自动重试（页面只显示锁住的发现）。 */
export async function saveTeaser(db: D1Database, id: string, teaser: StoryTeaser | null): Promise<void> {
  if (teaser) {
    await db.prepare(`UPDATE reports SET analysis_json = json_remove(json_set(analysis_json, '$.teaser', json(?)), '$.teaserPending') WHERE id = ?`)
      .bind(JSON.stringify(teaser), id).run();
  } else {
    await db.prepare(`UPDATE reports SET analysis_json = json_remove(json_set(analysis_json, '$.teaserFailed', 1), '$.teaserPending') WHERE id = ?`)
      .bind(id).run();
  }
}

/** 最近一段时间内某事件的次数（用于限制免费 AI 调用的总量）。 */
export async function countRecentEvents(db: D1Database, name: string, sinceMs: number): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM events WHERE name = ? AND ts >= ?`).bind(name, Date.now() - sinceMs).first<{ n: number }>();
  return row?.n ?? 0;
}
