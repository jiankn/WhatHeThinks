"use client";

/**
 * 完整报告的 6 个模块（BP §22）。每条结论把"事实"和"可能的含义"分开展示，
 * 并提供 View evidence 入口。
 */

import { fmtInt, fmtMinutes, fmtPct } from "@/lib/format";
import type { Claim, Dim, FullReport, InvestRow, TPNarrative } from "@/lib/report/types";
import { TrendChart } from "./TrendChart";

export type OpenEvidence = (title: string, ids: number[], splitAt?: number) => void;

// ── 通用 ─────────────────────────────────────────────────────

export function ModuleShell({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20" aria-labelledby={`m-${n}`}>
      <p className="font-mono text-xs text-rose">{String(n).padStart(2, "0")}</p>
      <h2 id={`m-${n}`} className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

const CONF_STYLE: Record<Claim["confidence"], string> = {
  high: "bg-ok/10 text-ok",
  medium: "bg-warn/10 text-warn",
  low: "bg-line text-muted",
};

export function ConfidenceChip({ c }: { c: Claim["confidence"] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONF_STYLE[c]}`}>
      {c === "high" ? "High" : c === "medium" ? "Medium" : "Low"} confidence
    </span>
  );
}

function EvidenceButton({ ids, title, open, splitAt }: { ids: number[]; title: string; open: OpenEvidence; splitAt?: number }) {
  if (!ids.length) return null;
  return (
    <button onClick={() => open(title, ids, splitAt)} className="text-sm font-medium text-rose underline-offset-2 hover:underline">
      View evidence ({ids.length})
    </button>
  );
}

export function ClaimCard({ claim, open }: { claim: Claim; open: OpenEvidence }) {
  return (
    <div className="card px-4 py-4 sm:px-5">
      <p className="font-medium">{claim.fact}</p>
      {claim.interpretation && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-ink/70">What it may mean: </span>
          {claim.interpretation}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ConfidenceChip c={claim.confidence} />
        <EvidenceButton ids={claim.evidenceIds} title={claim.fact} open={open} />
      </div>
    </div>
  );
}

// ── 01 Summary ──

export function SummaryModule({ r, open, n }: { r: FullReport; open: OpenEvidence; n: number }) {
  return (
    <ModuleShell n={n} title="What the pattern shows">
      <div className="rounded-[var(--radius-card)] bg-plum px-5 py-6 text-paper">
        <p className="font-display text-2xl leading-snug font-medium sm:text-[1.7rem]">{r.summary.headline}</p>
      </div>
      <div className="space-y-3 px-1 text-[17px] leading-relaxed">
        {r.summary.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {r.summary.claims.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3 px-1 text-sm text-muted">
          <span>Key finding</span>
          <ConfidenceChip c={c.confidence} />
          <EvidenceButton ids={c.evidenceIds} title={c.fact} open={open} />
        </div>
      ))}
    </ModuleShell>
  );
}

// ── 02 Interest ──

const LEVEL_TITLE: Record<FullReport["interest"]["level"], string> = {
  strong: "Strong observable interest",
  moderate: "Moderate observable interest",
  mixed: "Mixed observable interest",
  low: "Low observable interest",
};

const DIM_TONE: Record<Dim["level"], string> = {
  high: "bg-ok",
  moderate: "bg-warn",
  low: "bg-rose",
  insufficient: "bg-line",
};

/** 维度下方的内联解读 + 证据，避免与维度句子重复成一张卡片。 */
function DimClaim({ claim, open }: { claim: Claim; open: OpenEvidence }) {
  return (
    <div className="mt-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
      {claim.interpretation && (
        <p className="text-muted">
          <span className="font-medium text-ink/70">What it may mean: </span>
          {claim.interpretation}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <ConfidenceChip c={claim.confidence} />
        <EvidenceButton ids={claim.evidenceIds} title={claim.fact} open={open} />
      </div>
    </div>
  );
}

export function InterestModule({ r, open, n }: { r: FullReport; open: OpenEvidence; n: number }) {
  const i = r.interest;
  const claimFor = (d: Dim) => i.claims.find((c) => c.fact === d.sentence);
  return (
    <ModuleShell n={n} title="Is he interested?">
      <div className="card px-5 py-5">
        <p className="eyebrow">Based on his recent behavior</p>
        <p className="mt-2 font-display text-2xl font-semibold">{LEVEL_TITLE[i.level]}</p>
        {i.trendDeclining && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-warn">↘ Trending down recently</p>
        )}
        <p className="mt-2 text-muted">{i.note}</p>

        <ul className="mt-5 space-y-4">
          {i.dimensions.map((d) => (
            <li key={d.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{d.label}</span>
                <span className="text-xs text-muted capitalize">{d.level === "insufficient" ? "Not enough data" : d.level}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/70">
                {d.score !== null && (
                  <div className={`h-full rounded-full ${DIM_TONE[d.level]}`} style={{ width: `${Math.max(4, d.score * 100)}%` }} />
                )}
              </div>
              <p className="mt-1.5 text-sm text-muted">{d.sentence}</p>
              {claimFor(d) && <DimClaim claim={claimFor(d)!} open={open} />}
            </li>
          ))}
        </ul>
      </div>
      {/* 与维度句子不对应的结论单独展示 */}
      {i.claims
        .filter((c) => !i.dimensions.some((d) => d.sentence === c.fact))
        .map((c, k) => (
          <ClaimCard key={k} claim={c} open={open} />
        ))}
    </ModuleShell>
  );
}

// ── 03 Investment ──

function fmtRow(row: InvestRow, v: number): string {
  switch (row.format) {
    case "pct":
      return fmtPct(v);
    case "minutes":
      return fmtMinutes(v);
    case "chars":
      return `${fmtInt(v)} chars`;
    default:
      return fmtInt(v);
  }
}

export function InvestmentModule({ r, open, n }: { r: FullReport; open: OpenEvidence; n: number }) {
  return (
    <ModuleShell n={n} title="Who is more invested?">
      <div className="card px-5 py-5">
        <p className="font-display text-xl font-semibold">{r.investment.takeaway}</p>
        <div className="mt-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-you" /> You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-him" /> Him
          </span>
        </div>
        <ul className="mt-4 space-y-4">
          {r.investment.rows.map((row) => {
            // 回复时间越短越投入：按倒数计算占比
            const a = row.higherIsMore ? row.you : row.you > 0 ? 1 / row.you : 0;
            const b = row.higherIsMore ? row.him : row.him > 0 ? 1 / row.him : 0;
            const y = a + b > 0 ? a / (a + b) : 0.5;
            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="num font-semibold text-ink">{fmtRow(row, row.you)}</span>
                  <span className="text-center text-muted">{row.label}</span>
                  <span className="num font-semibold text-ink">{fmtRow(row, row.him)}</span>
                </div>
                <div className="mt-1.5 flex h-2 gap-0.5">
                  <div className="rounded-l-full bg-you" style={{ width: `${y * 100}%` }} />
                  <div className="rounded-r-full bg-him" style={{ width: `${(1 - y) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted">Bars show each person's share of the effort. For reply time, faster counts as more effort.</p>
      </div>
      {r.investment.claims.map((c, k) => (
        <ClaimCard key={k} claim={c} open={open} />
      ))}
    </ModuleShell>
  );
}

// ── 04 Timeline ──

function TurningPointCard({ p, open }: { p: TPNarrative; open: OpenEvidence }) {
  const cooling = p.direction === "cooling";
  return (
    <div className="card overflow-hidden">
      <div className={`px-5 py-4 ${cooling ? "bg-rose-soft" : "bg-ok/10"}`}>
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{cooling ? "Shift down" : "Shift up"}</p>
        <p className="mt-1 font-display text-xl font-semibold">{p.title}</p>
      </div>
      <div className="px-5 py-4">
        <p className="font-medium">{p.fact}</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-1.5 font-medium" />
              <th className="pb-1.5 text-right font-medium">Before</th>
              <th className="pb-1.5 text-right font-medium">After</th>
            </tr>
          </thead>
          <tbody className="num">
            {p.rows.map((row) => (
              <tr key={row.label} className="border-t border-dashed border-line">
                <td className="py-2 pr-2 font-sans text-muted">{row.label}</td>
                <td className="py-2 text-right">{row.before}</td>
                <td className="py-2 text-right font-semibold">{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {p.contextNote && <p className="mt-3 text-sm">{p.contextNote}</p>}
        {p.conflictNote && <p className="mt-2 text-sm font-medium">{p.conflictNote}</p>}
        <p className="mt-3 text-sm text-muted">
          <span className="font-medium text-ink/70">What it may mean: </span>
          {p.interpretation} {p.offlineCaveat}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ConfidenceChip c={p.confidence} />
          <EvidenceButton ids={p.evidenceIds} title={p.title} open={open} splitAt={p.date} />
        </div>
      </div>
    </div>
  );
}

export function TimelineModule({ r, open, n }: { r: FullReport; open: OpenEvidence; n: number }) {
  const t = r.timeline;
  return (
    <ModuleShell n={n} title="When things changed">
      {t.series.length >= 2 && <TrendChart series={t.series} points={t.points} />}
      {t.emptyNote && <p className="card px-5 py-4 text-muted">{t.emptyNote}</p>}
      {t.points.map((p) => (
        <TurningPointCard key={p.id} p={p} open={open} />
      ))}
    </ModuleShell>
  );
}

// ── 05 Mixed signals ──

function SignalColumn({ title, tone, claims, open, empty }: { title: string; tone: "ok" | "rose"; claims: Claim[]; open: OpenEvidence; empty: string }) {
  return (
    <div>
      <p className={`mb-2 flex items-center gap-2 text-sm font-semibold ${tone === "ok" ? "text-ok" : "text-rose"}`}>
        <span className={`h-2 w-2 rounded-full ${tone === "ok" ? "bg-ok" : "bg-rose"}`} />
        {title}
      </p>
      <div className="space-y-3">
        {claims.length ? claims.map((c, k) => <ClaimCard key={k} claim={c} open={open} />) : <p className="text-sm text-muted">{empty}</p>}
      </div>
    </div>
  );
}

export function MixedModule({ r, open, n }: { r: FullReport; open: OpenEvidence; n: number }) {
  const m = r.mixedSignals;
  return (
    <ModuleShell n={n} title="Mixed signals">
      <div className="grid gap-5 sm:grid-cols-2">
        <SignalColumn title="Signals of interest" tone="ok" claims={m.interest} open={open} empty="No strong interest signals recently." />
        <SignalColumn title="Signals of distance" tone="rose" claims={m.distance} open={open} empty="No distance patterns found recently." />
      </div>
      <div className="rounded-[var(--radius-card)] border border-line bg-paper px-5 py-4">
        <p className="eyebrow">What the combination suggests</p>
        <p className="mt-2">{m.combination}</p>
      </div>
    </ModuleShell>
  );
}

// ── 06 Next step ──

export function NextStepModule({ r, n }: { r: FullReport; n: number }) {
  const s = r.nextStep;
  return (
    <ModuleShell n={n} title="What to clarify next">
      <div className="rounded-[var(--radius-card)] bg-rose px-5 py-6 text-white">
        <p className="font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase">One question worth asking him</p>
        <p className="mt-3 font-display text-2xl leading-snug font-medium">“{s.question}”</p>
      </div>
      <div className="card space-y-3 px-5 py-5">
        <p>
          <span className="font-semibold">Why this question: </span>
          {s.why}
        </p>
        <p>
          <span className="font-semibold">How to ask: </span>
          {s.howToAsk}
        </p>
      </div>
      <p className="px-1 text-xs text-muted">
        We don't tell you whether to stay or go. That's yours to decide — this is just the clearest next step the pattern points to.
      </p>
    </ModuleShell>
  );
}
