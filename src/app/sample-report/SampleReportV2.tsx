"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, MessageIcon } from "@/components/icons";

const sections = [
  { id: "sample-answer", label: "Overview", icon: "overview" },
  { id: "sample-evidence", label: "Evidence", icon: "evidence" },
  { id: "sample-stage", label: "Relationship stage", icon: "stage" },
  { id: "sample-changes", label: "What changed", icon: "change" },
  { id: "sample-next", label: "What to do next", icon: "next" },
] as const;

function NavIcon({ type }: { type: (typeof sections)[number]["icon"] }) {
  if (type === "evidence") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12v8H9l-3.5 3v-3H4z" /></svg>;
  if (type === "stage") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.2 3.8 10A3.6 3.6 0 0 1 9 5.1l1 1 1-1A3.6 3.6 0 0 1 16.2 10z" /></svg>;
  if (type === "change") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 14.5 7.8 10l3 2.2 5.7-6.7" /><path d="M12.8 5.5h3.7v3.7" /></svg>;
  if (type === "next") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11.5 6.5 15 10l-3.5 3.5" /></svg>;
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" /></svg>;
}

function MetricIcon({ type }: { type: "chat" | "clock" | "calendar" }) {
  if (type === "clock") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>;
  if (type === "calendar") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6.5" width="15" height="13" rx="2" /><path d="M8 4.5v4M16 4.5v4M4.5 10.5h15M8 14h3M13 14h3" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H10l-5 4v-4H5z" /></svg>;
}

export function SampleReportV2() {
  const [activeSection, setActiveSection] = useState("sample-answer");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const targets = sections.map(({ id }) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { rootMargin: "-24% 0px -62% 0px", threshold: [0, 0.08, 0.25] });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const copyQuestion = async () => {
    await navigator.clipboard?.writeText("Would you like to pick a day to see each other this week?");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="sample-v2 sample-report-page" id="main-content">
      <aside className="sample-v2-sidebar" aria-label="Sample report sections">
        <div className="sample-v2-sidebar-inner">
          <p className="sample-v2-sidebar-title">In this report</p>
          <nav>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className={activeSection === section.id ? "is-active" : undefined} aria-current={activeSection === section.id ? "location" : undefined}>
                <NavIcon type={section.icon} /><span>{section.label}</span>
              </a>
            ))}
          </nav>
          <p className="sample-v2-sidebar-note">A clearer understanding can lead to a kinder next step.</p>
        </div>
      </aside>

      <div className="sample-v2-content">
        <nav className="sample-v2-mobile-progress" aria-label="Reading progress">
          <a href="#sample-answer" className={activeSection === "sample-answer" ? "is-active" : undefined}>Answer</a>
          <a href="#sample-evidence" className={activeSection === "sample-evidence" ? "is-active" : undefined}>Evidence</a>
          <a href="#sample-next" className={activeSection === "sample-next" ? "is-active" : undefined}>Next step</a>
        </nav>

        <section className="sample-v2-hero" id="sample-answer">
          <p className="sample-v2-eyebrow">YOUR ANSWER, FIRST</p>
          <h1>You&apos;re not imagining it.<span>His effort really has changed.</span></h1>

          <div className="sample-v2-stage-card">
            <div className="sample-v2-stage-heading"><span>Relationship stage</span><strong>Building momentum → Pullback</strong></div>
            <div className="sample-v2-stage-track" aria-label="Stage changed around May 18"><span className="sample-v2-stage-before" /><span className="sample-v2-stage-marker" /><span className="sample-v2-stage-after" /></div>
            <div className="sample-v2-stage-labels"><span>More consistent, warm, and engaged</span><b>Shift around May 18</b><span>Less consistent, more distance</span></div>
          </div>

          <div className="sample-v2-read">
            <p>OUR READ</p>
            <h2>He probably still likes you. The warmth is still there. But right now, he isn&apos;t treating this relationship like enough of a priority.</h2>
            <p className="sample-v2-read-note">That judgment comes from a repeated change in effort and follow-through, not from one slow reply.</p>
          </div>

          <div className="sample-v2-metrics" aria-label="The clearest changes">
            <article><span className="sample-v2-metric-icon"><MetricIcon type="chat" /></span><div><p>He starts the chat</p><strong><s>54%</s><span>22%</span></strong><small>Down by more than half</small></div></article>
            <article><span className="sample-v2-metric-icon"><MetricIcon type="clock" /></span><div><p>Typical reply time</p><strong><s>18 min</s><span>2 hr</span></strong><small>About 6× slower</small></div></article>
            <article><span className="sample-v2-metric-icon"><MetricIcon type="calendar" /></span><div><p>Concrete plans</p><strong><s>6</s><span>2</span></strong><small>Fewer plans that actually happen</small></div></article>
          </div>
        </section>

        <section className="sample-v2-section sample-v2-evidence" id="sample-evidence">
          <header className="sample-v2-section-heading"><p className="sample-v2-eyebrow">THE MESSAGES THAT MATTER</p><h2>Same warmth. Less movement.</h2><p>The difference is easiest to see when you compare what happened before and after the shift.</p></header>
          <div className="sample-v2-message-grid">
            <article className="sample-v2-message-card is-before">
              <div className="sample-v2-message-meta"><span>BEFORE</span><time dateTime="2024-04-28T20:14">Apr 28 · 8:14 PM</time></div>
              <div className="sample-v2-chat-bubble"><MessageIcon /><p>“Want to grab dinner on Friday? I can book that place you mentioned.”</p></div>
              <strong>Warmth + initiative + a real plan</strong>
            </article>
            <article className="sample-v2-message-card is-after">
              <div className="sample-v2-message-meta"><span>AFTER</span><time dateTime="2024-05-21T19:36">May 21 · 7:36 PM</time></div>
              <div className="sample-v2-chat-bubble"><MessageIcon /><p>“This week is a lot. Maybe soon?”</p></div>
              <strong>Kind tone, but no date and no next step</strong>
            </article>
          </div>
          <p className="sample-v2-evidence-caption">The earlier message moves the relationship forward. The later one keeps the door open without making a plan. That same difference shows up across several weeks.</p>
          <div className="sample-v2-strength">
            <div><span className="sample-v2-strength-mark" aria-hidden="true">✓</span><p><strong>Evidence strength: Clear pattern</strong><small>This is a repeated shift, not one bad day.</small></p></div>
            <Link href="/analyze" className="btn-primary">Analyze your own chat <ArrowRightIcon /></Link>
          </div>
        </section>

        <section className="sample-v2-section sample-v2-stage-detail" id="sample-stage">
          <div className="sample-v2-section-number" aria-hidden="true">01</div>
          <div><p className="sample-v2-eyebrow">DOES HE STILL LIKE YOU?</p><h2>Probably, yes. But liking you and showing up consistently are two different things.</h2><p>He still replies warmly and uses affectionate language. That matters. But lately the warmth has been stronger than the follow-through, which is why this reads as a pullback rather than steady momentum.</p><aside><strong>What this can&apos;t prove</strong><span>Messages cannot tell us everything happening offline or what he has not said out loud.</span></aside></div>
        </section>

        <section className="sample-v2-section sample-v2-details" id="sample-changes">
          <header className="sample-v2-section-heading"><p className="sample-v2-eyebrow">LOOK CLOSER</p><h2>What changed, in plain English</h2><p>Open any section if you want the detail behind the conclusion.</p></header>
          <details>
            <summary><span><b>01</b><strong>Effort and investment</strong></span><i aria-hidden="true">+</i></summary>
            <div className="sample-v2-detail-body"><h3>You&apos;ve been carrying more of the connection.</h3><p>You now start about 78% of the conversations. He still responds, but he is much less likely to open a conversation or turn a warm exchange into a plan.</p><div className="sample-v2-mini-facts"><span><small>You start</small><strong>78%</strong></span><span><small>His reply</small><strong>2 hr</strong></span><span><small>Recent plans</small><strong>2</strong></span></div></div>
          </details>
          <details>
            <summary><span><b>02</b><strong>When the shift happened</strong></span><i aria-hidden="true">+</i></summary>
            <div className="sample-v2-detail-body"><h3>The pattern changes around May 18.</h3><p>Before then, he initiated more often and replied within minutes. After that point, the change appears across initiation, reply time, and planning at the same time.</p><div className="sample-v2-mini-timeline" aria-label="A pattern change around May 18"><span>Apr 28</span><i /><b>May 18</b><i className="is-muted" /><span>Jun 6</span></div></div>
          </details>
          <details>
            <summary><span><b>03</b><strong>Warm words vs. real follow-through</strong></span><i aria-hidden="true">+</i></summary>
            <div className="sample-v2-detail-body"><h3>The words are affectionate. The actions stay vague.</h3><blockquote>“Been thinking about you.”</blockquote><p>That sounds caring, and it may be sincere. The missing piece is what comes next: a day, a time, or a clear attempt to see you.</p></div>
          </details>
        </section>

        <section className="sample-v2-section sample-v2-next" id="sample-next">
          <p className="sample-v2-eyebrow">WHAT TO DO NEXT</p>
          <h2>Ask one calm, specific question. Then watch what he does.</h2>
          <div className="sample-v2-question"><span>TRY THIS</span><p>“Would you like to pick a day to see each other this week?”</p><button type="button" onClick={copyQuestion} aria-live="polite">{copied ? "Copied" : "Copy"}</button></div>
          <div className="sample-v2-response-guide">
            <article><span className="is-good">1</span><div><strong>He picks a day</strong><p>That&apos;s real follow-through. You have something concrete to work with.</p></div></article>
            <article><span className="is-neutral">2</span><div><strong>He is busy, but offers another time</strong><p>He is still making room for the relationship.</p></div></article>
            <article><span className="is-stop">3</span><div><strong>He stays vague again</strong><p>Treat the pattern as your answer. Stop doing the work for both of you.</p></div></article>
          </div>
          <div className="sample-v2-final-cta"><div><p className="sample-v2-eyebrow">YOUR CONVERSATION WILL BE DIFFERENT</p><h3>See what your own messages actually show.</h3></div><Link href="/analyze" className="btn-primary">Analyze your own chat <ArrowRightIcon /></Link></div>
          <p className="sample-v2-disclaimer">This report finds communication patterns. It cannot read someone&apos;s mind or replace your own judgment.</p>
        </section>
      </div>
    </main>
  );
}
