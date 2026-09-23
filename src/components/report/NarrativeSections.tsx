import type { EvidenceMsg } from "@/lib/analysis/analysis-types";
import type { Claim, FullReport, InvestRow, PatternReading, ReportNarrative, TPNarrative } from "@/lib/report/types";
import type { ReactNode } from "react";
import { fmtDate } from "@/lib/format";
import { NextStepAdvice } from "./NextStepAdvice";
import { TrendChart } from "./TrendChart";

const FIT_LABEL: Record<PatternReading["fit"], string> = { stronger: "Fits best", possible: "Possible", weaker: "Fits less" };

/** 转折点前后各取他最近的两条消息，作为“前后原话对比”。 */
function beforeAfterQuotes(point: TPNarrative, evidence: EvidenceMsg[]) {
  const his = evidence.filter(m => point.evidenceIds.includes(m.id) && m.sender === "H").sort((a, b) => a.ts - b.ts);
  const clip = (t: string) => t.length > 140 ? `${t.slice(0, 139).trimEnd()}…` : t;
  return {
    before: his.filter(m => m.ts < point.date).slice(-2).map(m => ({ id: m.id, text: clip(m.text) })),
    after: his.filter(m => m.ts >= point.date).slice(0, 2).map(m => ({ id: m.id, text: clip(m.text) })),
  };
}

export function NarrativeSections({ narrative: n, report, liteMode, evidence, claims, value, open }: {
  narrative: ReportNarrative;
  report: FullReport;
  liteMode: boolean;
  evidence: EvidenceMsg[];
  claims: (items: Claim[]) => ReactNode;
  value: (row: InvestRow, n: number) => string;
  open: (title: string, ids: number[], splitAt?: number) => void;
}) {
  const point = liteMode ? undefined : report.timeline.points[0];
  const quotes = point ? beforeAfterQuotes(point, evidence) : null;
  const showChange = Boolean(point);
  const effort = <div className="reader-comparison" role="table" aria-label="Conversation effort comparison"><div role="row"><span role="columnheader">Across the analyzed messages</span><strong role="columnheader">You</strong><strong role="columnheader">Him</strong></div>{report.investment.rows.map(row => <div role="row" key={row.key}><span role="rowheader">{row.label}</span><strong role="cell">{value(row, row.you)}</strong><strong role="cell">{value(row, row.him)}</strong></div>)}</div>;

  return <>
    <nav className="reader-contents" aria-label="Report sections">
      <a href="#the-read">The short answer</a>
      {showChange && <a href="#the-change">When it changed</a>}
      <a href="#the-evidence">The receipts</a>
      {n.meaning && <a href="#the-meaning">What it usually means</a>}
      {n.yourSide && <a href="#your-side">Your side</a>}
      <a href="#the-next-step">What to do next</a>
    </nav>

    <section className="reader-section" id="the-read">
      <p className="reader-muted">Your question: {n.question}</p>
      <h2>The short answer.</h2>
      <p className="reader-lead">{n.answer}</p>
    </section>

    {point && <section className="reader-section" id="the-change">
      <h2>When it changed.</h2>
      <span className="v3-tag">Around {fmtDate(point.date)}</span>
      <p>{point.fact}</p>
      <div className="reader-before-after">{point.rows.map(row => <div key={row.label}><span>{row.label}</span><strong>{row.before}<i>→</i>{row.after}</strong></div>)}</div>
      {quotes && (quotes.before.length > 0 || quotes.after.length > 0) && <div className="reader-quotes">
        <div><span>What he sent before</span>{quotes.before.map(q => <blockquote key={q.id}>“{q.text}”</blockquote>)}</div>
        <div><span>What he sent after</span>{quotes.after.map(q => <blockquote key={q.id}>“{q.text}”</blockquote>)}</div>
      </div>}
      {point.evidenceIds.length > 0 && <button type="button" className="v3-text-link" onClick={() => open("Messages around this change", point.evidenceIds, point.date)}>Read the messages around this change ↗</button>}
      {report.timeline.series.length >= 2 && <div className="reader-chart"><TrendChart series={report.timeline.series} points={report.timeline.points} /></div>}
    </section>}

    <section className="reader-section" id="the-evidence"><h2>Why this is the read.</h2>{claims(n.supporting)}</section>

    {n.meaning && <section className="reader-section" id="the-meaning">
      <h2>What this pattern usually means.</h2>
      <div className="reader-patterns">{n.meaning.patterns.map((p, i) => <article key={i} className={`reader-pattern is-${p.fit}`}>
        <div><h3>{p.name}</h3><span>{FIT_LABEL[p.fit]}</span></div>
        <p>{p.why}</p>
        {p.evidenceIds.length > 0 && <button type="button" className="v3-text-link" onClick={() => open(p.name, p.evidenceIds)}>See the messages ↗</button>}
      </article>)}</div>
      <p className="reader-lead">{n.meaning.lean}</p>
    </section>}

    {n.yourSide && <section className="reader-section" id="your-side">
      <h2>Your side of this.</h2>
      <p className="reader-lead">{n.yourSide}</p>
      <details className="reader-details"><summary>How you each contribute</summary>{effort}</details>
    </section>}

    <section className="reader-section" id="the-context">
      <h2>What could change the picture.</h2>
      {claims(n.counterEvidence)}
      <p>{n.counterEvidenceNote}</p>
      <h3>The part that is easy to misread</h3>
      <p>{n.misread}</p>
      <aside className="reader-note"><strong>What remains uncertain</strong><p>{n.limitation}</p></aside>
    </section>

    <section className="reader-section" id="the-next-step"><h2>What to do next.</h2><NextStepAdvice nextStep={n.nextStep} /></section>

    {(!n.yourSide || !showChange) && <section className="reader-section" aria-labelledby="measures-title"><h2 id="measures-title">Explore the measured patterns.</h2><p>These measures describe this conversation. They are not a score for his feelings.</p>
      {!n.yourSide && <details className="reader-details"><summary>How you each contribute</summary>{effort}</details>}
      {!showChange && <details className="reader-details"><summary>Changes over time</summary>{liteMode ? <p>Without timestamps, we cannot measure reply times or place changes on a timeline.</p> : <>{report.timeline.emptyNote && <p>{report.timeline.emptyNote}</p>}{report.timeline.series.length >= 2 && <TrendChart series={report.timeline.series} points={report.timeline.points} />}</>}</details>}
    </section>}
  </>;
}
