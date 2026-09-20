"use client";
import Link from "next/link";
import type { Preview } from "@/lib/analysis/analysis-types";
import { SKUS } from "@/lib/pricing";
export function Paywall({ preview: p, busy, error, onUnlock, sample = false }: {
  preview: Preview; busy: boolean; error: string | null; onUnlock: () => void; sample?: boolean;
}) {
  return <section className="reader-paywall" aria-labelledby="paywall-title"><span aria-hidden="true">🔓</span><h2 id="paywall-title">There’s more to your story.</h2><p>Go beyond the first finding. Understand the pattern and what you could do next.</p><ul><li>{p.liteMode ? "A closer look at who invests more" : "The timeline of how things changed"}</li><li>Where warm words and effort line up — or don’t</li><li>Supporting messages behind the findings</li><li>A question to take back to the conversation</li></ul><div className="reader-price"><strong>{SKUS.full_report.label}</strong><span>USD · Once. No subscription.</span></div>{sample ? <Link href="/sample-report" className="btn-primary">Read the sample report ↗</Link> : <button type="button" className="btn-primary" onClick={onUnlock} disabled={busy}>{busy ? "Opening secure checkout…" : "Unlock my full report"}</button>}<p className="v3-fine">{sample ? "Fictional example · No payment taken" : "No account needed · Secure checkout"}</p>{error && <p role="alert" className="v3-error">{error}</p>}</section>;
}
