/**
 * POST /api/auth/recover-reports — 游客弄丢报告链接时，把该邮箱名下已付费报告的新链接发到该邮箱。
 * 无论是否找到都返回同样的结果，避免被用来试探某个邮箱是否买过。
 * 同一邮箱 10 分钟内只发一次；需要 Turnstile。
 */

import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/server/auth";
import { sha256Hex } from "@/lib/server/crypto";
import { sendReportLinksEmail } from "@/lib/server/email";
import { getDB, getEnv } from "@/lib/server/env";
import { issueEmailToken } from "@/lib/server/reports";
import { verifyTurnstile } from "@/lib/server/turnstile";

const COOLDOWN_MS = 10 * 60 * 1000;

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
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const db = await getDB();
  const now = Date.now();
  // 只存邮箱哈希，事件表里不出现邮箱本身
  const emailHash = (await sha256Hex(`recover:${email}`)).slice(0, 32);
  const recent = await db
    .prepare(`SELECT 1 FROM events WHERE name = 'report_recovery' AND props = ? AND ts > ? LIMIT 1`)
    .bind(JSON.stringify({ h: emailHash }), now - COOLDOWN_MS)
    .first();
  if (!recent) {
    const { results } = await db
      .prepare(`SELECT id, paid_at FROM reports WHERE email = ? COLLATE NOCASE AND paid_at IS NOT NULL ORDER BY paid_at DESC LIMIT 10`)
      .bind(email)
      .all<{ id: string; paid_at: number }>();
    await db.prepare(`INSERT INTO events (name, report_id, props, ts) VALUES ('report_recovery', NULL, ?, ?)`).bind(JSON.stringify({ h: emailHash }), now).run();
    if (results.length) {
      const env = await getEnv();
      const site = env.SITE_URL.replace(/\/$/, "");
      const links = [];
      for (const r of results) links.push({ url: `${site}/r/${r.id}#t=${await issueEmailToken(db, r.id)}`, paidAt: r.paid_at });
      await sendReportLinksEmail(env, { to: email, links });
    }
  }
  return NextResponse.json({ ok: true });
}
