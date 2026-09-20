import { NextResponse } from "next/server";
import {
  claimReportsForUser,
  createSession,
  getUserByEmail,
  isValidEmail,
  normalizeEmail,
  safeNextPath,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
} from "@/lib/server/auth";
import { getDB, getEnv } from "@/lib/server/env";
import { verifyTurnstile } from "@/lib/server/turnstile";

export async function POST(req: Request): Promise<Response> {
  let body: { email?: unknown; password?: unknown; turnstileToken?: unknown; next?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!(await verifyTurnstile(req, body.turnstileToken))) {
    return NextResponse.json({ error: "Please complete the security check again." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const db = await getDB();
  const user = isValidEmail(email) ? await getUserByEmail(db, email) : null;
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  if (user.email_verified_at) await claimReportsForUser(db, user);
  const session = await createSession(db, user.id);
  const env = await getEnv();
  const response = NextResponse.json({ ok: true, next: safeNextPath(typeof body.next === "string" ? body.next : null) });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: env.SITE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date(session.expiresAt),
  });
  return response;
}
