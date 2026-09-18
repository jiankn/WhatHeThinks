/** POST /api/followups — 记录追问意向（问题 + 邮箱）。需报告 token。PRD §5.8。 */

import { nanoid } from "nanoid";
import { getDB } from "@/lib/server/env";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { getAuthorizedRow } from "@/lib/server/reports";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request): Promise<Response> {
  let body: { reportId?: unknown; question?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("invalid json", 400);
  }
  const { reportId, question, email } = body;
  if (typeof reportId !== "string") return error("missing reportId", 400);
  if (typeof question !== "string" || question.trim().length < 5 || question.length > 300) return error("invalid question", 400);
  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email)) return error("invalid email", 400);

  const db = await getDB();
  const row = await getAuthorizedRow(db, reportId, req.headers.get(TOKEN_HEADER));
  if (!row) return error("not found", 404);

  await db
    .prepare(`INSERT INTO followups (id, report_id, email, question, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(nanoid(12), reportId, email.trim(), question.trim(), Date.now())
    .run();
  return json({ ok: true }, 201);
}
