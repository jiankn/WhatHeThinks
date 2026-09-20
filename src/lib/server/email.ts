/**
 * 通过 Resend 发送报告链接。未配置 RESEND_API_KEY 时跳过（开发环境）。
 * 日志不记录收件人与链接。
 */

export async function sendReportEmail(
  env: CloudflareEnv,
  opts: { to: string; link: string },
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn(JSON.stringify({ evt: "email_skipped", reason: "no RESEND_API_KEY" }));
    return false;
  }
  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f1a22">
  <p style="font-size:20px;font-weight:600;margin:0 0 16px">Your WhatHeThinks report is ready.</p>
  <p style="margin:0 0 20px;line-height:1.5">Thanks for your purchase. Your full report — the timeline, mixed signals and the receipts — is waiting for you.</p>
  <p style="margin:0 0 24px"><a href="${opts.link}" style="background:#b3305f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;display:inline-block">Open my report</a></p>
  <p style="font-size:13px;color:#6b6270;line-height:1.5;margin:0 0 8px">This link is your private key to the report — don't share it unless you want someone to see it.</p>
  <p style="font-size:13px;color:#6b6270;line-height:1.5;margin:0">Example messages are deleted automatically after 30 days. You can delete the whole report anytime from the bottom of the report page.</p>
</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "WhatHeThinks <reports@whathethinks.com>",
      to: [opts.to],
      subject: "Your WhatHeThinks report is ready",
      html,
    }),
  });
  if (!res.ok) console.error(JSON.stringify({ evt: "email_failed", status: res.status }));
  return res.ok;
}

export async function sendPasswordResetEmail(
  env: CloudflareEnv,
  opts: { to: string; link: string },
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn(JSON.stringify({ evt: "password_reset_email_skipped", reason: "no RESEND_API_KEY" }));
    return false;
  }
  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#241f26">
  <p style="font-size:22px;font-weight:700;margin:0 0 14px">Reset your WhatHeThinks password</p>
  <p style="margin:0 0 22px;line-height:1.6">Use the button below to choose a new password. This private link expires in one hour and works once.</p>
  <p style="margin:0 0 24px"><a href="${opts.link}" style="background:#e54b69;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700;display:inline-block">Choose a new password</a></p>
  <p style="font-size:13px;color:#6b6270;line-height:1.55;margin:0">If you did not request this, you can safely ignore the email. Your password has not changed.</p>
</div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "WhatHeThinks <reports@whathethinks.com>",
      to: [opts.to],
      subject: "Reset your WhatHeThinks password",
      html,
    }),
  });
  if (!response.ok) console.error(JSON.stringify({ evt: "password_reset_email_failed", status: response.status }));
  return response.ok;
}
