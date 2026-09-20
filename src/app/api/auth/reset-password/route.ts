import { NextResponse } from "next/server";
import { claimReportsForUser, getUserById, hashPassword, isValidPassword } from "@/lib/server/auth";
import { sha256Hex } from "@/lib/server/crypto";
import { getDB } from "@/lib/server/env";
import { verifyTurnstile } from "@/lib/server/turnstile";

export async function POST(req: Request): Promise<Response> {
  let body: { token?: unknown; password?: unknown; turnstileToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!(await verifyTurnstile(req, body.turnstileToken))) {
    return NextResponse.json({ error: "Please complete the security check again." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Use 10–128 characters for your password." }, { status: 400 });
  }
  const db = await getDB();
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(`SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`)
    .bind(tokenHash, Date.now())
    .first<{ user_id: string }>();
  if (!row) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  const now = Date.now();
  await db.batch([
    db
      .prepare(`UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?`)
      .bind(await hashPassword(password), now, now, row.user_id),
    db.prepare(`UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?`).bind(now, tokenHash),
    db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).bind(row.user_id),
  ]);
  const user = await getUserById(db, row.user_id);
  if (user) await claimReportsForUser(db, user);
  return NextResponse.json({ ok: true });
}
