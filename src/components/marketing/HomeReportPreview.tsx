"use client";

import { useState } from "react";

const EVIDENCE = [
  { id: "initiative", tab: "Who reaches out", label: "He starts the chat", before: "54%", after: "22%", note: "Down by more than half", observation: "You now open most conversations. He still replies, but he is much less likely to bring the chat back himself.", quote: "Been thinking about you.", quoteNote: "Warm, but it responds to your message instead of starting a new conversation." },
  { id: "reply", tab: "Reply time", label: "His typical reply time", before: "18 min", after: "2 hr", note: "About six times slower", observation: "The change repeats across several weeks, so the report treats it as a pattern rather than one busy day.", quote: "Sorry, just saw this.", quoteNote: "The words alone prove little. The repeated timing change is the useful evidence." },
  { id: "plans", tab: "Follow-through", label: "Concrete plans", before: "6", after: "2", note: "Fewer plans that happen", observation: "The tone stays affectionate, but fewer conversations now end with a date, time, or specific next step.", quote: "This week is a lot. Maybe soon?", quoteNote: "The door stays open, but there is no plan to move the relationship forward." },
] as const;

export function HomeReportPreview() {
  const [selected, setSelected] = useState<(typeof EVIDENCE)[number]["id"]>("initiative");
  const active = EVIDENCE.find((item) => item.id === selected) ?? EVIDENCE[0];

  const moveTab = (direction: -1 | 1) => {
    const current = EVIDENCE.findIndex((item) => item.id === selected);
    const next = (current + direction + EVIDENCE.length) % EVIDENCE.length;
    const nextItem = EVIDENCE[next];
    setSelected(nextItem.id);
    requestAnimationFrame(() => document.getElementById(`evidence-tab-${nextItem.id}`)?.focus());
  };

  return (
    <div className="studio-report" aria-label="Interactive sample report">
      <div className="studio-report-meta"><span>Sample report</span><span>Apr 28 — Jun 6</span></div>
      <div className="studio-report-heading"><p>OUR READ</p><h3>His effort really has changed.</h3><span>The warmth is still there. The follow-through isn&apos;t.</span></div>
      <div className="studio-report-tabs" role="tablist" aria-label="Explore the evidence">
        {EVIDENCE.map((item) => (
          <button key={item.id} type="button" role="tab" id={`evidence-tab-${item.id}`} aria-selected={selected === item.id} aria-controls={`evidence-panel-${item.id}`} tabIndex={selected === item.id ? 0 : -1} onClick={() => setSelected(item.id)} onKeyDown={(event) => { if (event.key === "ArrowLeft") moveTab(-1); if (event.key === "ArrowRight") moveTab(1); }}>{item.tab}</button>
        ))}
      </div>
      <div className="studio-report-evidence" role="tabpanel" id={`evidence-panel-${active.id}`} aria-labelledby={`evidence-tab-${active.id}`}>
        <div className="studio-report-metric"><p>{active.label}</p><div><s>{active.before}</s><i aria-hidden="true">→</i><strong>{active.after}</strong></div><span>{active.note}</span></div>
        <div className="studio-report-read">
          <p>{active.observation}</p>
          <div className="studio-report-timeline" aria-label="Pattern shifted around May 18"><span>Apr 28</span><i /><b><em />May 18</b><i className="is-after" /><span>Jun 6</span></div>
        </div>
        <blockquote><span>MESSAGE NEAR THE SHIFT</span><p>“{active.quote}”</p><footer>{active.quoteNote}</footer></blockquote>
      </div>
      <p className="studio-report-caveat">A texting pattern can show effort. It cannot read someone&apos;s mind or explain what happened offline.</p>
    </div>
  );
}
