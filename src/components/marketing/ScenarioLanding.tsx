import Link from "next/link";
import type { QuestionId } from "@/lib/questions";
import type { LandingPage } from "@/content/landing";
import { Faq } from "./Faq";
import { ChatScenesWall } from "./ChatScenesWall";
import { SCENARIO_GUIDANCE } from "@/content/scenario-guidance";

const scenarios = [
  { emoji: "💔", name: "Ex", q: "ex_came_back" },
  { emoji: "🌀", name: "Situationship", q: "situationship" },
  { emoji: "💌", name: "Boyfriend", q: "overview" },
  { emoji: "👀", name: "Crush", q: "likes_me" },
  { emoji: "💬", name: "Talking stage", q: "mixed_signals" },
  { emoji: "✈️", name: "Long distance", q: "energy_changed" },
] as const;
export function ChatCluster() {
  return <div className="v3-cluster" aria-hidden="true"><span>💔</span><span><img src="/icons/platforms/whatsapp.svg" alt="" width="36" height="36" /></span><span>💌</span><span>👀</span><span><img src="/icons/platforms/imessage.svg" alt="" width="36" height="36" /></span></div>;
}
function Start({ q = "overview", children = "Try it with your chat" }: { q?: QuestionId; children?: React.ReactNode }) {
  return <Link className="btn-primary v3-start" href={`/analyze?q=${q}`}>{children}<span aria-hidden="true">↗</span></Link>;
}
const examples = [
  { emoji: "🌀", label: "Mixed signals", title: "The warmth is there. The follow-through is less clear.", body: "Affectionate messages kept coming. Concrete plans became harder to find.", href: "/mixed-signals-text-analyzer" },
  { emoji: "💔", label: "A change in effort", title: "It wasn’t one slow reply. The pattern changed.", body: "Conversation starts and reply times shifted together over several weeks.", href: "/is-he-losing-interest" },
  { emoji: "💌", label: "Who reaches out", title: "You don’t have to count every first text yourself.", body: "See how often each of you starts the conversation, with the numbers side by side.", href: "/who-texts-first" },
];
export function ScenarioLanding({ page }: { page?: LandingPage }) {
  const q = page?.question ?? "overview";
  const guidance = page ? SCENARIO_GUIDANCE[page.slug] : undefined;
  return <main className="v3-marketing">
    <section className="v3-hero">
      <ChatCluster />
      <h1>{page?.h1 ?? <>Understand the signals<br />in his texts.</>}</h1>
      <p>{page?.lede ?? "An AI text message analyzer for your relationship conversations. Upload a WhatsApp export or paste messages to explore effort, mixed signals and changes over time."}</p>
      <Start q={q}>Get my free preview</Start>
      <span className="v3-fine">See your first finding before you decide. No account or card needed.</span>
      <div className="v3-scenarios" aria-label="Relationship scenarios">{scenarios.map(s => <Link key={s.name} href={`/analyze?q=${s.q}`}><span>{s.emoji}</span>{s.name}</Link>)}</div>
      <a className="v3-text-link" href="#see-the-report">See what you’ll get <span aria-hidden="true">↓</span></a>
    </section>
    {guidance && <section className="scenario-editorial"><h2>{guidance.heading}</h2>{guidance.paragraphs.map(p => <p key={p}>{p}</p>)}<h3>What to consider</h3><ul>{guidance.checks.map(c => <li key={c}>{c}</li>)}</ul><blockquote>{guidance.message}</blockquote><small>Illustrative wording, not a real customer conversation.</small><nav aria-label="Related guides">{guidance.links.map(([slug, text]) => <Link key={slug} href={`/${slug}`}>{text} ↗</Link>)}</nav></section>}
    <section className="v3-demo-section" id="see-the-report" aria-labelledby="demo-heading">
      <h2 id="demo-heading">A little outside perspective.</h2>
      <p className="v3-section-intro">A report you can actually read. And findings you can check.</p>
      <Link href="/sample-report" className="v3-report-demo" aria-label="Read the full sample report">
        <div className="v3-demo-top"><span>WhatHeThinks</span><span className="v3-tag">Sample report</span></div>
        <div className="v3-demo-body"><span className="v3-demo-emoji" aria-hidden="true">💌</span><h3>The warmth stayed.<br />The effort changed.</h3><p>He still sounds affectionate. But after May 18, you started carrying more of the conversation.</p><div className="v3-demo-numbers"><div><span>He starts chats</span><strong>54% <i>→</i> 22%</strong></div><div><span>His typical reply</span><strong>18m <i>→</i> 2h</strong></div></div><span className="v3-demo-open">Read the sample <span aria-hidden="true">↗</span></span></div>
      </Link>
      <p className="v3-fine">Illustrative data. Your report follows your conversation.</p>
      <div className="v3-compatibility"><img src="/icons/platforms/whatsapp.svg" alt="" width="24" height="24" /><span>WhatsApp TXT & ZIP</span><span>·</span><span>Or paste your messages</span></div>
    </section>
    <section className="v3-section" aria-labelledby="examples-heading"><header className="v3-section-heading"><h2 id="examples-heading">For the thing you keep wondering.</h2><p>Different conversations. Different questions.</p></header><div className="v3-examples">{examples.map(e => <Link href={e.href} key={e.label} className="v3-example"><div><span aria-hidden="true">{e.emoji}</span><span>{e.label}</span></div><h3>{e.title}</h3><p>{e.body}</p><span className="v3-text-link">Explore this question ↗</span></Link>)}</div></section>
    <ChatScenesWall />
    {!page && <section className="v3-section"><header className="v3-section-heading"><h2>Find the words. Understand the pattern.</h2><p>Practical guides for the conversation you want to have next.</p></header><div className="guide-card-grid">{[["texting-styles", "Understand your texting styles", "Short replies, long messages and different rhythms."], ["questions-to-ask-your-boyfriend", "Ask something worth talking about", "Questions and follow-ups for getting to know each other."], ["situationship", "Find clarity in a situationship", "Talk about expectations instead of guessing."], ["conversation-starters-over-text", "Start a natural conversation", "Openings and ideas for what to say next."]].map(([slug, title, description]) => <Link className="guide-card" key={slug} href={`/${slug}`}><h3>{title}</h3><p>{description}</p></Link>)}</div><Link href="/guides" className="v3-related">Explore all texting and relationship guides ↗</Link></section>}
    {page && <section className="v3-section v3-scenario-details"><header className="v3-section-heading"><h2>What this report looks at</h2></header><dl>{page.measures.map(m => <div key={m.name}><dt>{m.name}</dt><dd>{m.how}</dd></div>)}</dl>{page.answers.map(a => <details key={a.q}><summary>{a.q}</summary><p>{a.a}</p>{a.list && <ul>{a.list.map(x => <li key={x}>{x}</li>)}</ul>}</details>)}</section>}
    <section className="v3-section v3-how" aria-labelledby="how-heading"><header className="v3-section-heading"><h2 id="how-heading">Your chat. A clearer picture.</h2></header><ol><li><span>1</span><div><h3>Bring your conversation</h3><p>Export a WhatsApp chat without media, or paste a snippet. We’ll help you along the way.</p></div></li><li><span>2</span><div><h3>Read your free preview</h3><p>Get a first finding based on your messages. Decide if you want the full report.</p></div></li><li><span>3</span><div><h3>Keep it. Or share a little.</h3><p>Read the evidence, consider your next step, and share only the summary you choose.</p></div></li></ol></section>
    <section className="v3-section v3-trust"><div><span aria-hidden="true">🔒</span><h2>Your conversation<br />stays yours.</h2><p>The full export is processed on your device. Only statistics and limited redacted excerpts are sent to create your report. Nobody in the chat is notified.</p><Link href="/privacy" className="v3-text-link">Exactly how privacy works ↗</Link></div><div><span aria-hidden="true">💌</span><h2>Try the preview.<br />Then decide.</h2><p>Your first finding is free. Read what your own chat shows before deciding whether you want the full report.</p><span className="v3-tag">No subscription. No account required.</span></div></section>
    {page && <section className="v3-section v3-faq"><Faq items={page.faq} />{page.related.map(r => <Link key={r.slug} href={`/${r.slug}`} className="v3-related">{r.text} ↗</Link>)}</section>}
    <section className="v3-end"><ChatCluster /><h2>Ready to stop rereading?</h2><Start q={q} /><p className="v3-fine">Your first finding is free.</p></section>
  </main>;
}
