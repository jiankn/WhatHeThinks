"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { EvidenceDrawer } from "@/components/report/EvidenceDrawer";
import { StorySections } from "@/components/report/StorySections";
import { sampleReport } from "@/lib/report/sample";
import type { InvestRow } from "@/lib/report/types";
import { fmtInt, fmtMinutes, fmtPct, fmtRange } from "@/lib/format";
import { track } from "@/lib/events";

const report = sampleReport.report!;
const story = report.story!;
const evidence = sampleReport.evidence!;

function value(row: InvestRow, n: number) {
  return row.format === "pct" ? fmtPct(n) : row.format === "minutes" ? fmtMinutes(n) : row.format === "chars" ? `${fmtInt(n)} chars` : fmtInt(n);
}

function StartLink({ placement, children = "See what my chat shows" }: { placement: string; children?: React.ReactNode }) {
  return <Link href="/analyze" className="btn-primary" onClick={() => track("sample_cta_click", { content: placement })}>
    {children}<ArrowRightIcon />
  </Link>;
}

export function SampleReportStory() {
  const viewed = useRef(false);
  const [drawer, setDrawer] = useState<{ title: string; ids: number[] } | null>(null);
  const close = useCallback(() => setDrawer(null), []);
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
      <p className="sample-story-intro">Sophie&apos;s chat is fictional, but the pattern is common: he still sends affectionate messages, yet lately she&apos;s the one reaching out and suggesting plans. Below is the full report she would get, written to her, with the real messages shown as they were sent.</p>
      <div className="sample-story-start"><StartLink placement="hero" /><a href="#sample-read">Read the sample ↓</a></div>
      <p className="sample-story-fine">Free preview · No account or card needed</p>
    </header>

    <div className="reader-shell sample-story-report" id="sample-read" lang="en">
      <div className="reader-sample-banner">This is a demonstration using fictional messages.<Link href="/analyze">Try your own chat ↗</Link></div>
      <header className="reader-intro"><span className="reader-emoji" aria-hidden="true">💌</span><h2 className="sample-story-report-title">{story.title}</h2><p>{fmtInt(sampleReport.preview.totalMessages)} fictional messages · {fmtRange(sampleReport.preview.range)}</p></header>
      <StorySections story={story} report={report} liteMode={false} evidence={evidence} value={value} open={(title, ids) => setDrawer({ title, ids })} />
      <div className="sample-story-inline-cta"><p>Wondering what your chat would say?</p><StartLink placement="report-end">Get my free preview</StartLink></div>
    </div>

    <section className="sample-story-section" id="sample-offer" aria-labelledby="sample-offer-title">
      <h2 id="sample-offer-title">Start with your own free preview.</h2>
      <p>Your chat may tell a different story. It might be steady, or there may not be enough history to draw a conclusion. You can see the first finding before deciding whether to pay.</p>
      <dl className="sample-story-offer">
        <div><dt>Free preview <span>$0</span></dt><dd>Your first finding and a few measures of how you each contribute to the chat.</dd></div>
        <div><dt>Full report <span>Price shown at secure checkout</span></dt><dd>A report written to you, chapter by chapter, with your real messages as evidence, an honest look at other explanations, and a message you could send next. One payment, no subscription.</dd></div>
      </dl>
      <p className="sample-story-fine">WhatsApp exports let us compare changes over time. Pasted messages without timestamps give a more limited report, even if you pay.</p>
      <Link href="/sample-report?preview=1" className="sample-story-preview-link">See what the free preview looks like ↗</Link>
      <div className="sample-story-final">
        <h3>What&apos;s been on your mind?</h3>
        <p>Choose the question you want to explore, then add your chat.</p>
        <StartLink placement="footer" />
        <p className="sample-story-fine">No account or card needed for the preview.</p>
      </div>
      <p className="sample-story-privacy">Your full chat is parsed on your device. Statistics, your first name and up to 120 redacted excerpts are uploaded for the report. You can delete your report and its data. <Link href="/privacy">How we handle your chat</Link></p>
    </section>
    {drawer && <EvidenceDrawer title={drawer.title} messages={evidence.filter(m => drawer.ids.includes(m.id)).sort((a, b) => a.ts - b.ts)} expired={false} onClose={close} />}
  </main>;
}
