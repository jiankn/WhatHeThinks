import Link from "next/link";
import { type Guide, GUIDES_UPDATED, getGuide } from "@/content/guides";
import { getLanding } from "@/content/landing";
import { CopyMessage, CopyButton } from "./CopyMessage";
import { LinkedText } from "@/components/marketing/LinkedText";
import { SITE_NAME, SITE_URL, jsonLdHtml } from "@/lib/site";

export function contentLabel(slug: string) {
  return getGuide(slug)?.title ?? getLanding(slug)?.h1 ?? ({ "who-texts-first": "Who texts first?", "reply-time-calculator": "Reply time calculator" }[slug]) ?? slug;
}

export function GuidePage({ guide }: { guide: Guide }) {
  const url = `${SITE_URL}/${guide.slug}`;
  return <main className="guide-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml({ "@context": "https://schema.org", "@graph": [
      { "@type": "Article", headline: guide.title, description: guide.description, mainEntityOfPage: url, datePublished: GUIDES_UPDATED, dateModified: GUIDES_UPDATED, author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` }, { "@type": "ListItem", position: 3, name: guide.title, item: url }] },
    ] })} />
    <nav className="guide-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/guides">Guides</Link><span>/</span><span>{guide.category}</span></nav>
    <header className="guide-header"><p className="guide-kicker">{guide.category}</p><h1>{guide.title}</h1><p className="guide-intro"><LinkedText text={guide.intro} /></p><p className="guide-byline">By WhatHeThinks · Updated <time dateTime={GUIDES_UPDATED}>{new Date(GUIDES_UPDATED).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></p></header>
    <div className="guide-layout">
      <aside className="guide-toc"><nav aria-label="On this page"><p>On this page</p>{guide.sections.map((s, i) => <a key={s.heading} href={`#section-${i + 1}`}>{s.heading}</a>)}<a href="#questions">Common questions</a></nav></aside>
      <article className="guide-body">
        <p className="guide-editorial-note">Practical guidance, not a diagnosis or a way to read someone’s mind. Message examples are fictional; adapt them to your situation.</p>
        {guide.sections.map((s, i) => <section key={s.heading} id={`section-${i + 1}`}><h2>{s.heading}</h2>{s.paragraphs.map(p => <p key={p}><LinkedText text={p} /></p>)}
          {s.items && <><ul className="guide-prompts">{s.items.map(item => <li key={item}>{item}</li>)}</ul><CopyButton text={s.items.join("\n")} label={`Copy list: ${s.heading}`} /></>}
          {s.table && <div className="guide-table-scroll" role="region" aria-label={s.heading} tabIndex={0}><table><thead><tr>{s.table.headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{s.table.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => ci === 0 ? <th scope="row" key={ci}>{cell}</th> : <td key={ci}>{cell}</td>)}</tr>)}</tbody></table></div>}
          {s.messages && <div className="guide-messages">{s.messages.map(m => <CopyMessage key={m} text={m} />)}</div>}
        </section>)}
        <section id="questions"><h2>Common questions</h2>{guide.faq.map(f => <details key={f.q}><summary>{f.q}</summary><p><LinkedText text={f.a} /></p></details>)}</section>
        {guide.sources && <section className="guide-sources"><h2>Further reading and support</h2><ul>{guide.sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul><p>These resources inform the discussion of boundaries and pressure. The examples and practical prompts on this page were written for WhatHeThinks.</p></section>}
        <aside className="guide-cta"><h2>{guide.cta}</h2><p>Upload a WhatsApp export or paste messages for a free preview of your interaction patterns. Timing and trends depend on the data available. A report cannot establish feelings or safety.</p><Link className="btn-primary" href={`/analyze?q=${guide.question}`}>Analyze your chat <span aria-hidden="true">↗</span></Link><Link href="/sample-report">See a sample report</Link></aside>
        <section className="guide-related"><h2>Keep exploring</h2>{guide.related.map(slug => <Link key={slug} href={`/${slug}`}>{contentLabel(slug)} <span aria-hidden="true">↗</span></Link>)}</section>
      </article>
    </div>
  </main>;
}
