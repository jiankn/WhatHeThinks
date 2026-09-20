"use client";
import { useState } from "react";
import Link from "next/link";
import type { Preview } from "@/lib/analysis/analysis-types";
import { SKUS } from "@/lib/pricing";
export function Paywall({ preview: p, busy, error, onUnlock, sample = false }: {
  preview: Preview; busy: boolean; error: string | null; onUnlock: () => void; sample?: boolean;
}) {
  const [refundAccepted, setRefundAccepted] = useState(false);

  return <section className="reader-paywall" aria-labelledby="paywall-title">
    <h2 id="paywall-title">What does this mean for your next move?</h2>
    <p>Your preview shows the first finding. The full report puts it alongside the messages and gives you a way to talk about it.</p>
    <ul>
      <li>{p.liteMode ? "How you each contribute to the conversation" : "Where the texting changed, if a clear shift appears"}</li>
      <li>Signs of interest and distance, with supporting messages where available</li>
      <li>Other explanations to consider and what the chat cannot tell us</li>
      <li>A suggested question and guidance for possible responses</li>
    </ul>
    {p.liteMode && <p className="v3-fine">Pasted messages without timestamps cannot show reply times or when things changed. Paying does not add that missing information.</p>}
    <div className="reader-price"><strong>{SKUS.full_report.label}</strong><span>USD · One payment. No subscription.</span></div>
    {sample ? <Link href="/sample-report" className="btn-primary">See the full example ↗</Link> : <>
      <label className="reader-refund-consent">
        <input type="checkbox" checked={refundAccepted} onChange={event => setRefundAccepted(event.target.checked)} disabled={busy} />
        <span>I want my report generated immediately. I understand that once it is ready, I cannot cancel just because I changed my mind.</span>
      </label>
      <button type="button" className="btn-primary" onClick={onUnlock} disabled={busy || !refundAccepted}>{busy ? "Opening secure checkout…" : `Get my full report · ${SKUS.full_report.label}`}</button>
    </>}
    <p className="v3-fine">{sample ? "Fictional example. You won't be charged." : <>If generation fails after payment, you'll receive an automatic full refund. <Link href="/terms">Refund policy</Link></>}</p>
    {error && <p role="alert" className="v3-error">{error}</p>}
  </section>;
}
