import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES, GUIDE_CATEGORIES } from "@/content/guides";
import { LANDING_PAGES } from "@/content/landing";

export const metadata: Metadata = {
  title: { absolute: "Texting & Relationship Guides | What He Thinks" },
  description: "Explore practical guides to texting patterns, relationship questions, dating expectations and clearer conversations. Find examples and tools for your next step.",
  alternates: { canonical: "/guides" },
};
export default function Guides() {
  return <main className="guide-directory"><header className="guide-header"><p className="guide-kicker">The conversation library</p><h1>A little clarity.<br />A better next conversation.</h1><p className="guide-intro">Understand a pattern, find the words or work out what to ask. Start with the question that brought you here.</p></header>
    <nav className="guide-category-links" aria-label="Guide categories">{GUIDE_CATEGORIES.map((c, i) => <a key={c} href={`#category-${i}`}>{c}</a>)}</nav>
    {GUIDE_CATEGORIES.map((category, i) => <section id={`category-${i}`} key={category}><h2>{category}</h2><div className="guide-card-grid">{GUIDES.filter(g => g.category === category).map(g => <Link key={g.slug} href={`/${g.slug}`} className="guide-card"><h3>{g.title}</h3><p>{g.description}</p><span>Read the guide ↗</span></Link>)}</div></section>)}
    <section><h2>Explore your own conversation</h2><p>Guides explain the ideas. These pages show how a chat report can help you examine your own patterns.</p><div className="guide-card-grid">{LANDING_PAGES.map(p => <Link className="guide-card" key={p.slug} href={`/${p.slug}`}><h3>{p.h1}</h3><p>{p.description}</p></Link>)}</div><div className="guide-category-links"><Link href="/who-texts-first">Who texts first calculator</Link><Link href="/reply-time-calculator">Reply time calculator</Link></div></section>
  </main>;
}
