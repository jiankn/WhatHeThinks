/**
 * POST /api/stripe/webhook — Stripe 事件入口。校验签名后履约。
 * 本地调试：stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

import { getDB, getEnv } from "@/lib/server/env";
import { fulfillSession } from "@/lib/server/fulfill";
import { error, json } from "@/lib/server/http";
import { verifyStripeSignature, type CheckoutSession } from "@/lib/server/stripe";

export async function POST(req: Request): Promise<Response> {
  const env = await getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET) return error("webhook not configured", 503);

  const raw = await req.text();
  if (!(await verifyStripeSignature(raw, req.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) {
    return error("invalid signature", 400);
  }

  const event = JSON.parse(raw) as { type: string; data: { object: CheckoutSession } };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await fulfillSession(await getDB(), env, event.data.object);
  }
  return json({ received: true });
}
