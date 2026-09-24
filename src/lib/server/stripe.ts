/**
 * Stripe REST 调用（不引入 SDK，Workers 上更轻）与 webhook 签名校验。
 * 详见 docs/PRD.md §5.6。
 */

import { safeEqual } from "./crypto";

const API = "https://api.stripe.com/v1";

interface Params {
  [key: string]: string | number | Params;
}

/** 嵌套对象 → Stripe 的 form 编码（a[b][c]=v）。 */
export function formEncode(obj: Params, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}[${k}]` : k;
    return typeof v === "object" ? formEncode(v, key) : [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });
}

async function call<T>(secret: string, method: "GET" | "POST", path: string, params?: Params): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": "2025-03-31.basil",
    },
    body: params ? formEncode(params).join("&") : undefined,
  });
  const data = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(`stripe ${path}: ${data.error?.message ?? res.status}`);
  return data;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  payment_intent: string | null;
  amount_total: number | null;
  metadata: Record<string, string> | null;
  customer_details: { email: string | null } | null;
}

/**
 * 数字内容付款后立即交付：欧盟 / 英国要求顾客明确同意立即交付，并知道因此不能再以改变主意为由撤回。
 * 同意放在 Stripe 付款页（服务条款勾选框，由 Stripe 记录），我们的页面上不再单独放勾选框。
 */
export function consentText(termsUrl: string): string {
  return `I want my report written right away. I understand that once it is ready I can't cancel it just because I changed my mind, and I agree to the [Terms](${termsUrl}). If it can't be written, I get a full refund.`;
}

/** 账户没在 Stripe 后台填服务条款链接时，consent_collection 会被拒绝：退一步把同一句话放在付款按钮上方。 */
function isConsentUnavailable(err: unknown): boolean {
  return err instanceof Error && /terms of service|consent_collection|terms_of_service/i.test(err.message);
}

export async function createCheckoutSession(
  secret: string,
  opts: { reportId: string; sku: string; cents: number; name: string; priceId?: string; customerEmail?: string; successUrl: string; cancelUrl: string; termsUrl: string },
): Promise<CheckoutSession> {
  // 优先用 Stripe 后台的 Price（STRIPE_PRICE_ID）；未配置时按 SKUS 临时定价。
  // 账户开了 Managed Payments，产品必须带税码：txcd_10000000 = 电子服务；标价含税，顾客付的就是标价
  const item: Params = opts.priceId
    ? { quantity: 1, price: opts.priceId }
    : {
        quantity: 1,
        price_data: { currency: "usd", unit_amount: opts.cents, tax_behavior: "inclusive", product_data: { name: opts.name, tax_code: "txcd_10000000" } },
      };
  const base: Params = {
    mode: "payment",
    client_reference_id: opts.reportId,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    line_items: { 0: item },
    // 已登录用户：结账页预填并锁定账户邮箱，收据、报告邮件与账户用同一个地址
    ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
    metadata: { reportId: opts.reportId, sku: opts.sku },
    payment_intent_data: { metadata: { reportId: opts.reportId, sku: opts.sku } },
  };
  const text = consentText(opts.termsUrl);
  try {
    return await call<CheckoutSession>(secret, "POST", "/checkout/sessions", {
      ...base,
      consent_collection: { terms_of_service: "required" },
      custom_text: { terms_of_service_acceptance: { message: text } },
    });
  } catch (err) {
    if (!isConsentUnavailable(err)) throw err;
    console.warn(JSON.stringify({ evt: "checkout_consent_fallback", error: err instanceof Error ? err.message : "unknown" }));
    return call<CheckoutSession>(secret, "POST", "/checkout/sessions", { ...base, custom_text: { submit: { message: text.replace(/\[Terms\]\(([^)]+)\)/, "Terms ($1)") } } });
  }
}

export function getCheckoutSession(secret: string, id: string): Promise<CheckoutSession> {
  return call<CheckoutSession>(secret, "GET", `/checkout/sessions/${encodeURIComponent(id)}`);
}

export function refundPaymentIntent(secret: string, paymentIntent: string): Promise<{ id: string; status: string }> {
  return call(secret, "POST", "/refunds", { payment_intent: paymentIntent, reason: "requested_by_customer" });
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 校验 Stripe-Signature 头：t=时间戳,v1=签名。签名 = HMAC-SHA256(secret, `${t}.${rawBody}`)。
 * 超过 tolerance 秒的事件视为重放，拒绝。
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
  now = Date.now(),
): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`)));
  return sigs.some((s) => safeEqual(s, expected));
}
