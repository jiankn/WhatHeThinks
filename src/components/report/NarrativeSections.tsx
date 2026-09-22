import type { Claim, FullReport, InvestRow, ReportNarrative } from "@/lib/report/types";
import type { ReactNode } from "react";
import { fmtDate } from "@/lib/format";
import { NextStepAdvice } from "./NextStepAdvice";
import { TrendChart } from "./TrendChart";

export function NarrativeSections({ narrative: n, report, liteMode, claims, value, open }: {
  narrative: ReportNarrative;
  report: FullReport;
  liteMode: boolean;
  claims: (items: Claim[]) => ReactNode;
  value: (row: InvestRow, n: number) => string;
  open: (title: string, ids: number[], splitAt?: number) => void;
}) {
  return <>
    <nav className="reader-contents" aria-label="Report sections"><a href="#the-read">Your answer</a><a href="#the-evidence">The evidence</a><a href="#the-context">What to weigh up</a><a href="#the-next-step">Your next step</a></nav>
    <section className="reader-section" id="the-read"><p className="reader-muted">Your question: {n.question}</p><h2>What this chat shows.</h2><p className="reader-lead">{n.answer}</p></section>
    <section className="reader-section" id="the-evidence"><h2>Why this is the read.</h2>{claims(n.supporting)}</section>
    <section className="reader-section" id="the-context"><h2>What could change the picture.</h2>{claims(n.counterEvidence)}<p>{n.counterEvidenceNote}</p><h3>The part that is easy to misread</h3><p>{n.misread}</p><aside className="reader-note"><strong>What remains uncertain</strong><p>{n.limitation}</p></aside></section>
    <section className="reader-section" id="the-next-step"><h2>A next step you can actually take.</h2><NextStepAdvice nextStep={n.nextStep} /></section>
    <section className="reader-section" aria-labelledby="measures-title"><h2 id="measures-title">Explore the measured patterns.</h2><p>These measures describe this conversation. They are not a score for his feelings.</p>
      {report.order.map(key => {
        if (key === "investment") return <details className="reader-details" key={key}><summary>How you each contribute</summary><div className="reader-comparison" role="table" aria-label="Conversation effort comparison"><div role="row"><span role="columnheader">Across the analyzed messages</span><strong role="columnheader">You</strong><strong role="columnheader">Him</strong></div>{report.investment.rows.map(row => <div role="row" key={row.key}><span role="rowheader">{row.label}</span><strong role="cell">{value(row, row.you)}</strong><strong role="cell">{value(row, row.him)}</strong></div>)}</div></details>;
        if (key === "timeline") return <details className="reader-details" key={key}><summary>Changes over time</summary>{liteMode ? <p>Without timestamps, we cannot measure reply times or place changes on a timeline.</p> : <>{report.timeline.points.length ? report.timeline.points.map(point => <article className="reader-turning" key={point.id}><span className="v3-tag">{fmtDate(point.date)}</span><p>{point.fact}</p><div className="reader-before-after">{point.rows.map(row => <div key={row.label}><span>{row.label}</span><strong>{row.before}<i>→</i>{row.after}</strong></div>)}</div>{point.evidenceIds.length > 0 && <button type="button" className="v3-text-link" onClick={() => open("Messages around this change", point.evidenceIds, point.date)}>Read the messages around this change ↗</button>}</article>) : <p>{report.timeline.emptyNote}</p>}{report.timeline.series.length >= 2 && <TrendChart series={report.timeline.series} points={report.timeline.points} />}</>}</details>;
        return null;
      })}
    </section>
  </>;
}
