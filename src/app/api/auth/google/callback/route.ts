import { NextResponse } from "next/server";
import {
  claimReportsForUser,
  createSession,
  createUser,
  getUserByEmail,
  safeNextPath,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type UserRow,
} from "@/lib/server/auth";
import { getDB, getEnv } from "@/lib/server/env";

type GoogleClaims = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: string;
  iss?: string;
};

function readCookie(req: Request, name: string): string {
  const match = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function clearOAuthCookies(response: NextResponse): void {
  for (const name of ["wht_oauth_state", "wht_oauth_nonce", "wht_oauth_verifier", "wht_oauth_next"]) {
    response.cookies.set(name, "", { path: "/api/auth/google", maxAge: 0 });
  }
}

function fail(req: Request, reason: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, req.url));
  clearOAuthCookies(response);
  return response;
}

function tokenNonce(idToken: string): string {
  try {
    const part = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "="))).nonce || "";
  } catch {
    return "";
  }
}

export async function GET(req: Request): Promise<Response> {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code") || "";
  const state = requestUrl.searchParams.get("state") || "";
  const expectedState = readCookie(req, "wht_oauth_state");
  const nonce = readCookie(req, "wht_oauth_nonce");
  const verifier = readCookie(req, "wht_oauth_verifier");
  if (!code || !state || !expectedState || state !== expectedState || !nonce || !verifier) return fail(req, "google-state");

  const env = await getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail(req, "google-not-configured");
  const redirectUri = `${env.SITE_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenResponse.ok) return fail(req, "google-token");
  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token || tokenNonce(tokens.id_token) !== nonce) return fail(req, "google-token");

  const claimsResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
  );
  if (!claimsResponse.ok) return fail(req, "google-token");
  const claims = (await claimsResponse.json()) as GoogleClaims;
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (
    !claims.sub ||
    !claims.email ||
    !verified ||
    (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com") ||
    claims.aud !== env.GOOGLE_CLIENT_ID ||
    Number(claims.exp || 0) * 1000 <= Date.now()
  ) {
    return fail(req, "google-identity");
  }

  const db = await getDB();
  let user = await db.prepare(`SELECT * FROM users WHERE google_sub = ?`).bind(claims.sub).first<UserRow>();
  if (!user) {
    user = await getUserByEmail(db, claims.email);
    if (user?.google_sub && user.google_sub !== claims.sub) return fail(req, "google-account-conflict");
    if (user) {
      await db
        .prepare(`UPDATE users SET google_sub = ?, name = COALESCE(name, ?), image_url = COALESCE(image_url, ?), email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?`)
        .bind(claims.sub, claims.name || null, claims.picture || null, Date.now(), Date.now(), user.id)
        .run();
      user = { ...user, google_sub: claims.sub, name: user.name || claims.name || null, image_url: user.image_url || claims.picture || null };
    } else {
      user = await createUser(db, {
        email: claims.email,
        name: claims.name,
        imageUrl: claims.picture,
        googleSub: claims.sub,
        verified: true,
      });
    }
  }
  await claimReportsForUser(db, user);
  const session = await createSession(db, user.id);
  const destination = safeNextPath(readCookie(req, "wht_oauth_next"));
  const response = NextResponse.redirect(new URL(destination, env.SITE_URL));
  clearOAuthCookies(response);
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
