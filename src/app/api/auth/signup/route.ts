import { NextResponse } from "next/server";
import {
  createSession,
  createUser,
  getUserByEmail,
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  safeNextPath,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/server/auth";
import { getDB, getEnv } from "@/lib/server/env";
import { verifyTurnstile } from "@/lib/server/turnstile";

export async function POST(req: Request): Promise<Response> {
  let body: { name?: unknown; email?: unknown; password?: unknown; turnstileToken?: unknown; next?: unknown };
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
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Use 10–128 characters for your password." }, { status: 400 });
  }
  const db = await getDB();
  if (await getUserByEmail(db, email)) {
    return NextResponse.json({ error: "An account already exists for this email. Sign in instead." }, { status: 409 });
  }
  const user = await createUser(db, { email, name, passwordHash: await hashPassword(password) });
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
