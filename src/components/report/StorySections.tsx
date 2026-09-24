import type { EvidenceMsg } from "@/lib/analysis/analysis-types";
import type { FullReport, InvestRow, ReportStory } from "@/lib/report/types";
import { fmtDate } from "@/lib/format";
import { NextStepAdvice } from "./NextStepAdvice";
import { TrendChart } from "./TrendChart";

/** 证据里的 [you] 换回她的名字；[him] 保持原样（他的名字从未上传）。 */
function display(text: string, youName?: string) {
  return youName ? text.replace(/\[you\]/g, youName) : text;
}

function Bubble({ msg, youName, liteMode }: { msg: EvidenceMsg; youName?: string; liteMode: boolean }) {
  const mine = msg.sender === "Y";
  return <figure className={`story-bubble ${mine ? "is-you" : "is-him"}`}>
    <blockquote>{display(msg.text, youName)}</blockquote>
    <figcaption>{mine ? "You" : "Him"}{liteMode ? "" : ` · ${fmtDate(msg.ts)}`}</figcaption>
  </figure>;
}

export function StorySections({ story: s, report, liteMode, evidence, value, open }: {
  story: ReportStory;
  report: FullReport;
  liteMode: boolean;
  evidence: EvidenceMsg[];
  value: (row: InvestRow, n: number) => string;
  open: (title: string, ids: number[], splitAt?: number) => void;
}) {
  const byId = new Map(evidence.map(m => [m.id, m]));
  const expired = evidence.length === 0;
  const effort = <div className="reader-comparison" role="table" aria-label="Conversation effort comparison"><div role="row"><span role="columnheader">Across the analyzed messages</span><strong role="columnheader">You</strong><strong role="columnheader">Him</strong></div>{report.investment.rows.map(row => <div role="row" key={row.key}><span role="rowheader">{row.label}</span><strong role="cell">{value(row, row.you)}</strong><strong role="cell">{value(row, row.him)}</strong></div>)}</div>;
  const showChart = !liteMode && report.timeline.series.length >= 2;

  return <>
    <nav className="reader-contents" aria-label="Report sections">
      {s.chapters.map(c => <a key={c.id} href={`#chapter-${c.id}`}>{c.title}</a>)}
      <a href="#my-read">My read</a>
      <a href="#the-next-step">What to do next</a>
    </nav>

    <section className="reader-section story-opening" id="the-read">
      <p className="reader-muted">Your question: {s.question}</p>
      {s.opening.map((p, i) => <p key={i} className={i === 0 ? "reader-lead" : undefined}>{p}</p>)}
    </section>

    {s.chapters.map((c, i) => <section className="reader-section story-chapter" id={`chapter-${c.id}`} key={c.id}>
      <span className="story-chapter-emoji" aria-hidden="true">{c.emoji}</span>
      <h2>{c.title}</h2>
      <p className="story-span">{c.span}</p>
      {i === 0 && expired && <aside className="reader-note"><p>The original messages quoted in this report were deleted after 30 days, as promised. The reading itself stays.</p></aside>}
      {c.blocks.map((b, j) => {
        if ("p" in b) return <p key={j}>{b.p}</p>;
        const msg = byId.get(b.quote);
        return msg ? <Bubble key={j} msg={msg} youName={s.youName} liteMode={liteMode} /> : null;
      })}
    </section>)}

    <section className="reader-section" id="the-turn">
      <h2>The moment that matters most.</h2>
      <p className="reader-lead">{s.turn.text}</p>
      {s.turn.evidenceIds.length > 0 && !expired && <button type="button" className="v3-text-link" onClick={() => open("The moment that matters most", s.turn.evidenceIds)}>Read those messages ↗</button>}
      {showChart && <details className="reader-details"><summary>See the week-by-week pattern</summary><TrendChart series={report.timeline.series} points={report.timeline.points} /></details>}
    </section>

    <section className="reader-section" id="my-read">
      <h2>The other honest reading.</h2>
      <p>{s.otherReading}</p>
      <h2 className="story-subhead">My read.</h2>
      <p className="reader-lead">{s.read}</p>
    </section>

    <section className="reader-section" id="your-side">
      <h2>Your side of this.</h2>
      <p className="reader-lead">{s.yourSide}</p>
      <details className="reader-details"><summary>How you each contribute</summary>{effort}</details>
    </section>

    <section className="reader-section" id="the-next-step">
      <h2>What to do next.</h2>
      <NextStepAdvice nextStep={s.nextStep} />
      <p className="story-signoff">{s.signoff}</p>
    </section>
  </>;
}
