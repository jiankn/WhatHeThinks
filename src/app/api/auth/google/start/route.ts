import { NextResponse } from "next/server";
import { newToken } from "@/lib/server/crypto";
import { getEnv } from "@/lib/server/env";
import { safeNextPath } from "@/lib/server/auth";

function base64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET(req: Request): Promise<Response> {
  const env = await getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", req.url));
  }
  const state = newToken();
  const nonce = newToken();
  const verifier = newToken();
  const challenge = base64Url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const next = safeNextPath(new URL(req.url).searchParams.get("next"));
  const redirectUri = `${env.SITE_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url);
  const options = {
    httpOnly: true,
    secure: env.SITE_URL.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/api/auth/google",
    maxAge: 600,
  };
  response.cookies.set("wht_oauth_state", state, options);
  response.cookies.set("wht_oauth_nonce", nonce, options);
  response.cookies.set("wht_oauth_verifier", verifier, options);
  response.cookies.set("wht_oauth_next", next, options);
  return response;
}
