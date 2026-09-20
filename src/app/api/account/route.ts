import { NextResponse } from "next/server";
import { getRequestUser, SESSION_COOKIE } from "@/lib/server/auth";
import { getDB, getEnv } from "@/lib/server/env";

function sameOrigin(req: Request, siteUrl: string): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.origin === new URL(req.url).origin || originUrl.origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const env = await getEnv();
  if (!sameOrigin(req, env.SITE_URL)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const db = await getDB();
  const user = await getRequestUser(req, db);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { results } = await db.prepare(`SELECT id FROM reports WHERE user_id = ?`).bind(user.id).all<{ id: string }>();
  const statements = results.flatMap(({ id }) => [
    db.prepare(`DELETE FROM report_shares WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM evidence WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM followups WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM events WHERE report_id = ?`).bind(id),
    db.prepare(`DELETE FROM reports WHERE id = ?`).bind(id),
  ]);
  statements.push(
    db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).bind(user.id),
    db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).bind(user.id),
    db.prepare(`DELETE FROM users WHERE id = ?`).bind(user.id),
  );
  await db.batch(statements);
  const response = NextResponse.json({ deleted: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
