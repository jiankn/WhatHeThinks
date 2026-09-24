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
  const opts = { reportId: "r1", sku: "full_report", cents: 1990, name: "Full Report", successUrl: "https://x.co/ok", cancelUrl: "https://x.co/no", termsUrl: "https://x.co/terms" };

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
  it("已登录时预填账户邮箱，未登录时不传", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ id: "cs_1", url: "https://checkout" })));
    vi.stubGlobal("fetch", request);
    await createCheckoutSession("sk_test", { ...opts, customerEmail: "me@example.com" });
    await createCheckoutSession("sk_test", opts);
    const bodies = request.mock.calls.map(c => new URLSearchParams(String(c[1]?.body)));
    expect(bodies[0].get("customer_email")).toBe("me@example.com");
    expect(bodies[1].has("customer_email")).toBe(false);
  });
  it("在 Stripe 付款页要求勾选立即交付的同意", async () => {
    const body = await sentBody();
    expect(body.get("consent_collection[terms_of_service]")).toBe("required");
    const text = body.get("custom_text[terms_of_service_acceptance][message]")!;
    expect(text).toContain("right away");
    expect(text).toContain("changed my mind");
    expect(text).toContain("[Terms](https://x.co/terms)");
  });
  it("后台没填服务条款链接时，把同一句话放在付款按钮上方", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard." } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "cs_1", url: "https://checkout" })));
    vi.stubGlobal("fetch", request);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const session = await createCheckoutSession("sk_test", opts);
    expect(session.id).toBe("cs_1");
    const retry = new URLSearchParams(String(request.mock.calls[1][1]?.body));
    expect(retry.has("consent_collection[terms_of_service]")).toBe(false);
    expect(retry.get("custom_text[submit][message]")).toContain("Terms (https://x.co/terms)");
  });
  it("开了 Managed Payments 时去掉自定义文字；条款链接也没填时开普通付款页", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "custom_text cannot be used with Managed Payments, which is enabled by default on your account." } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard." } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "cs_1", url: "https://checkout" })));
    vi.stubGlobal("fetch", request);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await createCheckoutSession("sk_test", opts)).id).toBe("cs_1");
    const bodies = request.mock.calls.map(c => new URLSearchParams(String(c[1]?.body)));
    expect(bodies[1].get("consent_collection[terms_of_service]")).toBe("required");
    expect([...bodies[1].keys()].some(k => k.startsWith("custom_text"))).toBe(false);
    expect([...bodies[2].keys()].some(k => k.startsWith("custom_text") || k.startsWith("consent_collection"))).toBe(false);
  });
  it("其他错误照常抛出，不重试", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }));
    vi.stubGlobal("fetch", request);
    await expect(createCheckoutSession("sk_test", opts)).rejects.toThrow("Invalid API key");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("未配置时按 SKU 临时定价", async () => {
    const body = await sentBody();
    expect(body.has("line_items[0][price]")).toBe(false);
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("1990");
  });
});
