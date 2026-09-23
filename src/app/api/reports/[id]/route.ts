/**
 * GET    /api/reports/:id — 读取报告（付费前只返回 preview）。
 * PATCH  /api/reports/:id — 付费前修改完整报告的侧重点 { question, customQuestion? }。
 * DELETE /api/reports/:id — 硬删除报告与证据。
 * 均需 x-report-token 头。详见 docs/PRD.md §5.7。
 */

import { CUSTOM_QUESTION_MAX, isQuestionId } from "@/lib/questions";
import { getDB } from "@/lib/server/env";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { deleteReport, getAuthorizedRow, setFocus, toView } from "@/lib/server/reports";
import { getRequestUser } from "@/lib/server/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const db = await getDB();
  const rowByToken = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  const user = await getRequestUser(req, db);
  const row = rowByToken ?? (user ? await db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(id, user.id).first<import("@/lib/server/reports").ReportRow>() : null);
  if (!row) return error("not found", 404);
  const view = await toView(db, row);
  view.account = { signedIn: Boolean(user), saved: Boolean(user && row.user_id === user.id) };
  return json(view);
}

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  let body: { question?: unknown; customQuestion?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("invalid json", 400);
  }
  const { question, customQuestion } = body;
  if (!isQuestionId(question)) return error("invalid question", 400);
  let custom: string | null = null;
  if (question === "custom") {
    if (typeof customQuestion !== "string") return error("invalid customQuestion", 400);
    custom = customQuestion.trim();
    if (custom.length < 5 || custom.length > CUSTOM_QUESTION_MAX) return error("invalid customQuestion", 400);
  }

  const db = await getDB();
  const rowByToken = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  const user = rowByToken ? null : await getRequestUser(req, db);
  const row = rowByToken ?? (user ? await db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(id, user.id).first<import("@/lib/server/reports").ReportRow>() : null);
  if (!row) return error("not found", 404);
  if (!(await setFocus(db, id, question, custom))) return error("already paid", 409);
  return json({ question, customQuestion: custom });
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const db = await getDB();
  const rowByToken = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  const user = rowByToken ? null : await getRequestUser(req, db);
  const row = rowByToken ?? (user ? await db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(id, user.id).first<import("@/lib/server/reports").ReportRow>() : null);
  if (!row) return error("not found", 404);
  await deleteReport(db, id);
  return json({ deleted: true });
}
