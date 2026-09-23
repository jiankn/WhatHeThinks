import { afterEach, describe, it, expect, vi } from "vitest";
import { createCheckoutSession, formEncode, verifyStripeSignature } from "@/lib/server/stripe";

async function sign(secret: string, t: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("formEncode", () => {
  it("嵌套对象编码为 a[b][c]=v", () => {
    expect(formEncode({ mode: "payment", line_items: { 0: { quantity: 1, price_data: { unit_amount: 999 } } } })).toEqual([
      "mode=payment",
      "line_items%5B0%5D%5Bquantity%5D=1",
      "line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=999",
    ]);
  });
  it("值会被 URL 编码", () => {
    expect(formEncode({ success_url: "https://x.co/r/1?session_id={CHECKOUT_SESSION_ID}" })[0]).toBe(
      "success_url=https%3A%2F%2Fx.co%2Fr%2F1%3Fsession_id%3D%7BCHECKOUT_SESSION_ID%7D",
    );
  });
});

describe("verifyStripeSignature", () => {
  const secret = "whsec_test";
  const body = '{"type":"checkout.session.completed"}';
  const now = 1_760_000_000_000;
  const t = now / 1000;

  it("正确签名通过", async () => {
    const header = `t=${t},v1=${await sign(secret, t, body)}`;
    expect(await verifyStripeSignature(body, header, secret, 300, now)).toBe(true);
  });
  it("多个 v1 中有一个正确即通过（密钥轮换）", async () => {
    const header = `t=${t},v1=${"0".repeat(64)},v1=${await sign(secret, t, body)}`;
    expect(await verifyStripeSignature(body, header, secret, 300, now)).toBe(true);
  });
  it("篡改请求体、错误密钥、缺少头都拒绝", async () => {
    const header = `t=${t},v1=${await sign(secret, t, body)}`;
    expect(await verifyStripeSignature(body + " ", header, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, header, "whsec_other", 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, null, secret, 300, now)).toBe(false);
  });
  it("超过 5 分钟的事件视为重放，拒绝", async () => {
    const old = t - 301;
    const header = `t=${old},v1=${await sign(secret, old, body)}`;
    expect(await verifyStripeSignature(body, header, secret, 300, now)).toBe(false);
  });
});

describe("createCheckoutSession", () => {
  afterEach(() => vi.unstubAllGlobals());
  const opts = { reportId: "r1", sku: "full_report", cents: 1990, name: "Full Report", successUrl: "https://x.co/ok", cancelUrl: "https://x.co/no" };

  async function sentBody(priceId?: string): Promise<URLSearchParams> {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "cs_1", url: "https://checkout" })));
    vi.stubGlobal("fetch", request);
    await createCheckoutSession("sk_test", { ...opts, priceId });
    return new URLSearchParams(String(request.mock.calls[0][1]?.body));
  }

  it("配置了 Price ID 时用后台价格", async () => {
    const body = await sentBody("price_123");
    expect(body.get("line_items[0][price]")).toBe("price_123");
    expect(body.has("line_items[0][price_data][unit_amount]")).toBe(false);
  });
  it("未配置时按 SKU 临时定价", async () => {
    const body = await sentBody();
    expect(body.has("line_items[0][price]")).toBe(false);
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("1990");
  });
});
