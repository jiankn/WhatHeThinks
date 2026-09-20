import { NextResponse } from "next/server";
import { getUserByEmail, isValidEmail, normalizeEmail } from "@/lib/server/auth";
import { newToken, sha256Hex } from "@/lib/server/crypto";
import { sendPasswordResetEmail } from "@/lib/server/email";
import { getDB, getEnv } from "@/lib/server/env";
import { verifyTurnstile } from "@/lib/server/turnstile";

export async function POST(req: Request): Promise<Response> {
  let body: { email?: unknown; turnstileToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!(await verifyTurnstile(req, body.turnstileToken))) {
    return NextResponse.json({ error: "Please complete the security check again." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (isValidEmail(email)) {
    const db = await getDB();
    const user = await getUserByEmail(db, email);
    if (user) {
      const token = newToken();
      const now = Date.now();
      await db.batch([
        db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < ?`).bind(user.id, now),
        db
          .prepare(`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
          .bind(await sha256Hex(token), user.id, now + 60 * 60 * 1000, now),
      ]);
      const env = await getEnv();
      await sendPasswordResetEmail(env, {
        to: user.email,
        link: `${env.SITE_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
