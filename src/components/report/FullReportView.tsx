"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { fmtDate, fmtInt, fmtMinutes, fmtPct, fmtRange } from "@/lib/format";
import type { Claim, FullReport, InvestRow } from "@/lib/report/types";
import type { ReportView } from "@/lib/report/view";
import { track } from "@/lib/events";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { TrendChart } from "./TrendChart";
import { ShareResult } from "./ShareResult";
import { SaveToAccount } from "./SaveToAccount";
import { NarrativeSections } from "./NarrativeSections";
import { NextStepAdvice } from "./NextStepAdvice";

function value(row: InvestRow, n: number) {
  return row.format === "pct" ? fmtPct(n) : row.format === "minutes" ? fmtMinutes(n) : row.format === "chars" ? `${fmtInt(n)} chars` : fmtInt(n);
}
export function FullReportView({ view, report, token, onDelete, deleteBusy = false, deleteError = null, sample = false }: {
  view: ReportView; report: FullReport; token: string; onDelete?: () => void; deleteBusy?: boolean; deleteError?: string | null; sample?: boolean;
}) {
  const [drawer, setDrawer] = useState<{ title: string; ids: number[]; splitAt?: number } | null>(null);
  const close = useCallback(() => setDrawer(null), []);
  const open = (title: string, ids: number[], splitAt?: number) => { setDrawer({ title, ids, splitAt }); if (!sample) track("evidence_open", { n: ids.length }, view.id); };
  const claims = (items: Claim[]) => items.map((claim, i) => <div className="reader-claim" key={i}><p>{claim.fact}</p>{claim.interpretation && <p className="reader-muted">{claim.interpretation}</p>}<div className="reader-claim-meta"><span>{claim.confidence === "high" ? "Clear pattern" : claim.confidence === "medium" ? "Moderate evidence" : "Early signal"}</span>{claim.evidenceIds.length > 0 && <button type="button" onClick={() => open(claim.fact, claim.evidenceIds)}>See supporting messages ↗</button>}</div></div>);
  return <main className="reader-shell" lang="en">
    <div className="reader-topline"><span className="v3-tag">{sample ? "Sample · fictional conversation" : "Your private report"}</span><span>{fmtInt(view.preview.totalMessages)} messages</span></div>
    {sample && <div className="reader-sample-banner">This is a demonstration using fictional messages.<Link href="/analyze">Try your own chat ↗</Link></div>}
    <header className="reader-intro"><span className="reader-emoji" aria-hidden="true">💌</span><h1>{report.summary.headline}</h1><p>{view.preview.liteMode ? "A first look at the messages you pasted" : fmtRange(view.preview.range)}</p></header>
    {report.narrative ? <NarrativeSections narrative={report.narrative} report={report} liteMode={view.preview.liteMode} evidence={view.evidence ?? []} claims={claims} value={value} open={open} /> : <>
    <nav className="reader-contents" aria-label="Report sections"><a href="#the-read">The read</a><a href="#the-effort">The effort</a><a href="#the-change">What changed</a><a href="#the-signals">Mixed signals</a><a href="#the-next-step">What next</a></nav>
    <section className="reader-section" id="the-read"><h2>Here’s the read.</h2>{report.summary.paragraphs.map((p,i) => <p key={i}>{p}</p>)}<aside className="reader-note">{report.interest.note}</aside>{claims(report.summary.claims)}<details className="reader-details"><summary>Look at the individual signals</summary><dl className="reader-dimensions">{report.interest.dimensions.map(d => <div key={d.key}><dt>{d.label}<span>{d.level === "insufficient" ? "Not enough data" : d.level}</span></dt><dd>{d.sentence}</dd></div>)}</dl>{claims(report.interest.claims)}</details></section>
    <section className="reader-section" id="the-effort"><h2>Who’s showing up?</h2><p className="reader-lead">{report.investment.takeaway}</p><div className="reader-comparison" role="table" aria-label="Conversation effort comparison"><div role="row"><span role="columnheader">Across the analyzed messages</span><strong role="columnheader">You</strong><strong role="columnheader">Him</strong></div>{report.investment.rows.map(row => <div role="row" key={row.key}><span role="rowheader">{row.label}</span><strong role="cell">{value(row,row.you)}</strong><strong role="cell">{value(row,row.him)}</strong></div>)}</div>{claims(report.investment.claims)}</section>
    <section className="reader-section" id="the-change"><h2>When the rhythm changed.</h2>{view.preview.liteMode ? <p>Without timestamps, we can’t place changes on a timeline. A WhatsApp export makes that possible.</p> : <>{report.timeline.points.length ? report.timeline.points.map(point => <article className="reader-turning" key={point.id}><span className="v3-tag">{fmtDate(point.date)} · {point.direction === "warming" ? "More engagement" : "Less engagement"}</span><h3>{point.title}</h3><p>{point.fact}</p><p>{point.interpretation}</p><div className="reader-before-after">{point.rows.map(row => <div key={row.label}><span>{row.label}</span><strong>{row.before}<i>→</i>{row.after}</strong></div>)}</div><p className="reader-muted">{point.offlineCaveat}</p>{point.evidenceIds.length > 0 && <button className="v3-text-link" onClick={() => open(point.title,point.evidenceIds,point.date)}>Read the messages around this change ↗</button>}</article>) : <p>{report.timeline.emptyNote ?? "No sharp change stands out in the available messages."}</p>}{report.timeline.series.length >= 2 && <details className="reader-details"><summary>Explore the week-by-week timeline</summary><TrendChart series={report.timeline.series} points={report.timeline.points} /></details>}</>}</section>
    <section className="reader-section" id="the-signals"><h2>Words. Actions. The space between.</h2><p className="reader-lead">{report.mixedSignals.combination}</p><div className="reader-signal-group"><h3>Signs of connection</h3>{report.mixedSignals.interest.length ? claims(report.mixedSignals.interest) : <p>No strong pattern was found in this window.</p>}</div><div className="reader-signal-group"><h3>Signs of distance</h3>{report.mixedSignals.distance.length ? claims(report.mixedSignals.distance) : <p>No clear distance pattern was found in this window.</p>}</div></section>
    <section className="reader-section" id="the-next-step"><h2>A way to talk about it</h2><NextStepAdvice nextStep={report.nextStep} /></section>
    </>}
    <aside className="reader-note"><strong>What the messages can't tell us</strong><p>Messages show behavior, not everything happening offline or exactly what someone feels. {report.meta.writer === "mock" ? "This report uses measured patterns and structured explanations." : "The explanations are generated from measured patterns and selected evidence."}</p></aside>
    {!sample && view.account && <SaveToAccount reportId={view.id} token={token} signedIn={view.account.signedIn} saved={view.account.saved} />}
    <ShareResult preview={view.preview} reportId={sample ? undefined : view.id} token={token} sample={sample} reportHeadline={report.narrative ? report.summary.headline : undefined} />
    <div className="reader-end"><Link href="/analyze" className="btn-primary">{sample ? "Get my free preview" : "Analyze another chat"} ↗</Link><Link href="/account">Manage saved reports</Link>{onDelete && <button className="v3-danger-link" onClick={onDelete} disabled={deleteBusy}>{deleteBusy ? "Deleting…" : "Delete this report and its data"}</button>}{deleteError && <p role="alert">{deleteError}</p>}</div>
    {drawer && <EvidenceDrawer title={drawer.title} messages={(view.evidence ?? []).filter(m => drawer.ids.includes(m.id)).sort((a,b) => a.ts - b.ts)} expired={!sample && Date.now() > view.createdAt + 30 * 86400000} splitAt={drawer.splitAt} onClose={close} />}
  </main>;
}
