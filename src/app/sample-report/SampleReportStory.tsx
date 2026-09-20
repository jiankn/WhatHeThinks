"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { NextStepAdvice } from "@/components/report/NextStepAdvice";
import { sampleReport } from "@/lib/report/sample";
import { fmtInt, fmtMinutes, fmtPct } from "@/lib/format";
import { track } from "@/lib/events";

const report = sampleReport.report!;
const comparison = sampleReport.preview.headline!.comparison!;
const excerpts = [
  { label: "Before the change", date: "May 10", ids: [1, 2], note: "He suggests dinner, names a day, and offers to book." },
  { label: "After the change", date: "May 24", ids: [3, 4], note: "You suggest meeting. He says he is busy, without offering another time in this exchange." },
];

function StartLink({ placement, children = "See what my chat shows" }: { placement: string; children?: React.ReactNode }) {
  return <Link href="/analyze" className="btn-primary" onClick={() => track("sample_cta_click", { content: placement })}>
    {children}<ArrowRightIcon />
  </Link>;
}

export function SampleReportStory() {
  const viewed = useRef(false);
  useEffect(() => {
    if (!viewed.current) {
      track("sample_report_view");
      viewed.current = true;
    }
  }, []);

  return <main className="sample-story">
    <header className="sample-story-hero">
      <p className="sample-story-label">Sample report <span>Fictional conversation</span></p>
      <h1>He still texts me. Why does it feel like I&apos;m doing all the work?</h1>
      <p className="sample-story-intro">He still sends affectionate messages, but lately you&apos;re usually the one reaching out or suggesting plans. You want to know what changed.</p>
      <div className="sample-story-start"><StartLink placement="hero" /><a href="#sample-read">Read the sample ↓</a></div>
      <p className="sample-story-fine">Free preview · No account or card needed</p>
    </header>

    <nav className="sample-story-nav" aria-label="Sample report sections">
      <a href="#sample-evidence">Your messages</a><a href="#sample-next">What to say</a><a href="#sample-offer">Your report</a>
    </nav>

    <section className="sample-story-read" id="sample-read" aria-labelledby="sample-read-title">
      <p className="sample-story-fine">{fmtInt(sampleReport.preview.totalMessages)} fictional messages · April 13 to July 5, 2026</p>
      <h2 id="sample-read-title">He&apos;s still warm when you talk.<br />He reaches out less often.</h2>
      <p>He starts fewer conversations from around May 18, and replies take longer. The affectionate messages continue. If a nice text leaves you hopeful, but you&apos;re still unsure where you stand, that difference may help explain it.</p>
      <p>You have a change you can ask about. The messages alone can&apos;t tell you what he feels or what else is happening in his life.</p>
    </section>

    <section className="sample-story-section" id="sample-evidence" aria-labelledby="sample-evidence-title">
      <h2 id="sample-evidence-title">Here&apos;s where the difference shows up.</h2>
      <div className="sample-story-excerpts">
        {excerpts.map(excerpt => <figure key={excerpt.label}>
          <figcaption><strong>{excerpt.label}</strong><span>{excerpt.date}</span></figcaption>
          <div className="sample-story-messages">
            {sampleReport.evidence!.filter(message => excerpt.ids.includes(message.id)).map(message => <blockquote key={message.id} className={message.sender === "H" ? "is-him" : "is-her"}>
              <span>{message.sender === "H" ? "Him" : "You"}</span><p>{message.text}</p>
            </blockquote>)}
          </div>
          <p className="sample-story-caption">{excerpt.note}</p>
        </figure>)}
      </div>
      <p>A few days later, he writes, &quot;{sampleReport.evidence!.find(message => message.id === 6)!.text}&quot; It&apos;s an affectionate reply. There still isn&apos;t a new plan in these excerpts.</p>
      <div className="sample-story-table-wrap">
        <table className="sample-story-table">
          <caption>The wider pattern in this fictional example</caption>
          <thead><tr><th scope="col">His texting</th><th scope="col">Apr 13 to May 17</th><th scope="col">May 18 to Jul 5</th></tr></thead>
          <tbody>
            <tr><th scope="row">Share of chat starts</th><td>{fmtPct(comparison.initiation.before)}</td><td>{fmtPct(comparison.initiation.after)}</td></tr>
            <tr><th scope="row">Typical reply time</th><td>{fmtMinutes(comparison.reply.before)}</td><td>{fmtMinutes(comparison.reply.after)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="sample-story-fine">These are illustrative figures for the sample, not statistics calculated from the excerpts above. Your report uses your own messages.</p>
      <details className="sample-story-details"><summary>What do these measures mean?</summary><p>A new chat starts after a gap of at least six hours. His share is the proportion he starts in each period. Typical reply time is the median of measured replies. Neither measure tells you how he feels about you.</p></details>
      <div className="sample-story-inline-cta"><p>Wondering whether your chat has changed too?</p><StartLink placement="evidence">Get my free preview</StartLink></div>
    </section>

    <section className="sample-story-section sample-story-meaning" aria-labelledby="sample-meaning-title">
      <h2 id="sample-meaning-title">You can ask him to reach out more.</h2>
      <p>Work, stress, or conversations you&apos;ve had in person could explain some of the change. His warm replies matter too. There isn&apos;t enough here to conclude that he has lost interest in you.</p>
      <p>Still, you&apos;re doing more of the reaching out. If you&apos;d like that to feel more mutual, you can say so. You don&apos;t have to work out exactly why things changed before telling him what you need.</p>
    </section>

    <section className="sample-story-section" id="sample-next" aria-labelledby="sample-next-title">
      <h2 id="sample-next-title">What you could say</h2>
      <NextStepAdvice nextStep={report.nextStep} />
    </section>

    <section className="sample-story-section" id="sample-offer" aria-labelledby="sample-offer-title">
      <h2 id="sample-offer-title">Start with your own free preview.</h2>
      <p>Your chat may show something different. It might be steady, or there may not be enough history to draw a conclusion. You can see the first finding before deciding whether to pay.</p>
      <dl className="sample-story-offer">
        <div><dt>Free preview <span>$0</span></dt><dd>Your first finding and a few measures of how you each contribute to the chat.</dd></div>
        <div><dt>Full report <span>Price shown after your preview</span></dt><dd>The findings explained with available message evidence, limits to the interpretation, and a suggested question with guidance for possible responses. One payment, no subscription.</dd></div>
      </dl>
      <p className="sample-story-fine">WhatsApp exports let us compare changes over time. Pasted messages without timestamps give a more limited report, even if you pay.</p>
      <Link href="/sample-report?preview=1" className="sample-story-preview-link">See what the free preview looks like ↗</Link>
      <div className="sample-story-final">
        <h3>What&apos;s been on your mind?</h3>
        <p>Choose the question you want to explore, then add your chat.</p>
        <StartLink placement="footer" />
        <p className="sample-story-fine">No account or card needed for the preview.</p>
      </div>
      <p className="sample-story-privacy">Your full chat is parsed on your device. Statistics and up to 120 redacted excerpts are uploaded for the report. You can delete your report and its data. <Link href="/privacy">How we handle your chat</Link></p>
    </section>
  </main>;
}
