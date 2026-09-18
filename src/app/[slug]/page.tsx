/**
 * 落地页模板（SSG）。内容见 src/content/landing.ts。
 * 全部内容服务端渲染；只有进入分析的 CTA 是链接，不依赖客户端 JS。
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaLink, CtaNote } from "@/components/marketing/CtaLink";
import { Faq } from "@/components/marketing/Faq";
import { PrivacyPromises } from "@/components/marketing/PrivacyPromises";
import { SampleCard } from "@/components/marketing/SampleCard";
import { getLanding, LANDING_PAGES, LANDING_UPDATED } from "@/content/landing";
import { jsonLdHtml, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getLanding((await params).slug);
  if (!page) return {};
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `/${page.slug}`, type: "website", siteName: SITE_NAME },
  };
}

export default async function LandingPage({ params }: Props) {
  const page = getLanding((await params).slug);
  if (!page) notFound();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: page.eyebrow, item: `${SITE_URL}/${page.slug}` },
    ],
  };
  const related = page.related.map((r) => ({ ...r, page: getLanding(r.slug)! }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(breadcrumb)} />

      <section className="grid items-center gap-10 pt-10 pb-12 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div>
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">{page.h1}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{page.lede}</p>
          <div className="mt-7">
            <CtaLink q={page.question}>{page.cta}</CtaLink>
            <CtaNote />
          </div>
        </div>
        <SampleCard kind={page.sample} caption={page.sampleCaption} />
      </section>

      <div className="mx-auto max-w-2xl space-y-16 pb-8">
        <section aria-labelledby="measure-title">
          <h2 id="measure-title" className="font-display text-2xl font-semibold sm:text-3xl">
            What we measure
          </h2>
          <p className="mt-2 text-muted">No mind reading — these are the exact behaviors we count across your whole chat.</p>
          <dl className="mt-5 space-y-4">
            {page.measures.map((m) => (
              <div key={m.name} className="border-l-2 border-rose/40 pl-4">
                <dt className="font-semibold">{m.name}</dt>
                <dd className="mt-0.5 text-muted">{m.how}</dd>
              </div>
            ))}
          </dl>
        </section>

        {page.answers.map((a) => (
          <section key={a.q}>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{a.q}</h2>
            <p className="mt-3 text-[17px] leading-relaxed">{a.a}</p>
            {a.list && (
              <ul className="mt-4 space-y-2">
                {a.list.map((li) => (
                  <li key={li} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section aria-labelledby="uses-title">
          <h2 id="uses-title" className="font-display text-2xl font-semibold sm:text-3xl">
            When women use this
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {page.useCases.map((u) => (
              <div key={u.title} className="card px-4 py-4">
                <p className="font-semibold">{u.title}</p>
                <p className="mt-1 text-sm text-muted">{u.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-muted">
            Not quite your question? You can also{" "}
            {related.map((r, i) => (
              <span key={r.slug}>
                {i > 0 && " or "}
                <Link href={`/${r.slug}`} className="text-rose underline underline-offset-2 hover:text-rose-dark">
                  {r.text}
                </Link>
              </span>
            ))}
            .
          </p>
        </section>

        <PrivacyPromises />

        <Faq items={page.faq} />

        <section className="text-center">
          <h2 className="font-display text-3xl font-semibold">Stop guessing. Read the signals.</h2>
          <div className="mt-5">
            <CtaLink q={page.question}>{page.cta}</CtaLink>
            <CtaNote />
          </div>
        </section>

        <p className="text-center text-xs text-faint">
          Last updated{" "}
          <time dateTime={LANDING_UPDATED}>
            {new Date(LANDING_UPDATED).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
          </time>
        </p>
      </div>
    </main>
  );
}
