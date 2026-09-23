/**
 * POST /api/reports/:id/claim — 把报告保存到当前登录账户。
 * 必须同时：已登录，并用报告 token 证明能访问这份报告。已属于别的账户的报告不会被转走。
 */

import { getRequestUser } from "@/lib/server/auth";
import { getDB } from "@/lib/server/env";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { attachReportToUser, getAuthorizedRow } from "@/lib/server/reports";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return error("invalid origin", 403);
  const { id } = await params;
  const db = await getDB();
  const user = await getRequestUser(req, db);
  if (!user) return error("sign in required", 401);
  const row = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  if (!row) return error("not found", 404);
  if (row.user_id === user.id) return json({ saved: true });
  if (row.user_id !== null) return error("saved to another account", 409);
  await attachReportToUser(db, id, user.id);
  return json({ saved: true });
}
