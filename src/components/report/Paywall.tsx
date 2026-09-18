"use client";

import type { Preview } from "@/lib/analysis/analysis-types";
import { LockIcon } from "@/components/icons";
import { SKUS } from "@/lib/pricing";

/** 付费墙（BP §24）：不写 "Buy Report"，而是列出她还没看到的具体内容。 */
export function Paywall({
  preview: p,
  busy,
  error,
  onUnlock,
}: {
  preview: Preview;
  busy: boolean;
  error: string | null;
  onUnlock: () => void;
}) {
  const c = p.counts;
  const cards = [
    !p.liteMode && {
      title: c.shifts ? `${c.shifts} major ${c.shifts === 1 ? "shift" : "shifts"}` : "Your full timeline",
      cta: "See the timeline",
    },
    {
      title: c.mixedSignals ? `${c.mixedSignals} mixed ${c.mixedSignals === 1 ? "signal" : "signals"}` : "Mixed signals",
      cta: "See where words and actions differ",
    },
    {
      title: c.evidence ? `${c.evidence} supporting messages` : "The receipts",
      cta: "View the evidence",
    },
    { title: "Your biggest unanswered question", cta: "See what the pattern suggests" },
  ].filter(Boolean) as { title: string; cta: string }[];

  return (
    <section className="mt-10" aria-labelledby="paywall-title">
      <h2 id="paywall-title" className="text-center font-display text-3xl font-semibold sm:text-4xl">
        {p.headline ? "We found what changed." : "Your full report is ready."}
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.title} className="card relative overflow-hidden px-5 py-5">
            <p className="font-semibold">{card.title}</p>
            <div className="mt-3 space-y-2 blur-[3px] select-none" aria-hidden>
              <div className="h-2.5 w-11/12 rounded-full bg-line" />
              <div className="h-2.5 w-3/4 rounded-full bg-line" />
              <div className="h-2.5 w-5/6 rounded-full bg-rose-soft" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-rose">
              <LockIcon className="h-3.5 w-3.5" /> {card.cta}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button className="btn-primary w-full max-w-sm text-lg" onClick={onUnlock} disabled={busy}>
          {busy ? "Opening secure checkout…" : `Unlock Full Report — ${SKUS.full_report.label}`}
        </button>
        <p className="mt-2 text-sm text-muted">One-time payment · No subscription</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-dark">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
