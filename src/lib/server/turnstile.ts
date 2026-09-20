import { getEnv } from "./env";

const DEV_SITE_KEY = "1x00000000000000000000AA";
const DEV_SECRET_KEY = "1x0000000000000000000000000000000AA";

type TurnstileResult = { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };

export async function getTurnstileSiteKey(): Promise<string> {
  const env = await getEnv();
  if (env.TURNSTILE_SITE_KEY) return env.TURNSTILE_SITE_KEY;
  if (env.SITE_URL?.includes("localhost") || env.SITE_URL?.includes("127.0.0.1")) return DEV_SITE_KEY;
  return "";
}

export async function verifyTurnstile(req: Request, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length < 5 || token.length > 2048) return false;
  const env = await getEnv();

  let result: TurnstileResult;
  if (env.TURNSTILE_VERIFY_URL) {
    const response = await fetch(env.TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) return false;
    result = (await response.json()) as TurnstileResult;
  } else {
    const local = env.SITE_URL?.includes("localhost") || env.SITE_URL?.includes("127.0.0.1");
    const secret = env.TURNSTILE_SECRET_KEY || (local ? DEV_SECRET_KEY : "");
    if (!secret) return false;
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: req.headers.get("cf-connecting-ip") || undefined,
        idempotency_key: crypto.randomUUID(),
      }),
    });
    if (!response.ok) return false;
    result = (await response.json()) as TurnstileResult;
  }

  return result.success === true && (!result.action || result.action === "turnstile-spin-v1");
}
