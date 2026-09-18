/**
 * 首页。Hero 文案见 BP §10；定价只展示现在真实可买的 SKU。
 * 问题入口链接到各落地页（保证落地页距首页 1 次点击）。
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { CtaLink, CtaNote } from "@/components/marketing/CtaLink";
import { Faq } from "@/components/marketing/Faq";
import { PrivacyPromises } from "@/components/marketing/PrivacyPromises";
import { SampleCard } from "@/components/marketing/SampleCard";
import { LANDING_PAGES } from "@/content/landing";
import { SKUS } from "@/lib/pricing";
import { jsonLdHtml, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "WhatHeThinks — See When His Texting Changed" },
  description:
    "Upload your WhatsApp chat and see what his texting behavior is actually showing: who initiates, how much effort he gives, and the week things changed. Free preview, private by default.",
  alternates: { canonical: "/" },
  openGraph: { title: "What does he really think? Read the signals.", url: "/", type: "website", siteName: SITE_NAME },
};

const STEPS = [
  ["Export your chat", "From WhatsApp on iPhone or Android — “Without media” is perfect. Takes about 20 seconds."],
  ["We read the pattern", "Every message is analyzed on your device: who starts, who replies, who asks, who plans, week by week."],
  ["See what changed", "Get a free preview in seconds. Unlock the full timeline, mixed signals and the receipts for $9.99."],
] as const;

const MODULES = [
  ["What the pattern shows", "A plain-English summary that answers the question you asked."],
  ["Is he interested?", "Strong, moderate, mixed or low observable interest across 5 behaviors — never a fake “love score.”"],
  ["Who is more invested?", "You vs him on initiation, questions, plans, repair and reply time."],
  ["When things changed", "The weeks his behavior shifted, with before-and-after numbers."],
  ["Mixed signals", "Where his words and his actions point in different directions."],
  ["What to clarify next", "One question worth asking him directly — not a verdict."],
] as const;

const FAQ = [
  { q: "What does WhatHeThinks actually analyze?", a: "His texting behavior in your real chat history: who starts conversations, reply times, questions, plans, warmth and how all of it changed over time. We don't claim to read his mind — we show what the pattern shows, with the messages behind it." },
  { q: "Is my chat uploaded?", a: "No. Your chat is parsed and analyzed in your browser. To build your report, we send statistics plus up to 120 example messages with names, emails, phone numbers and links replaced. Those examples are deleted after 30 days." },
  { q: "Which apps are supported?", a: "WhatsApp exports (.txt or .zip) from iPhone and Android. You can also paste text. iMessage support is coming." },
  { q: "How much does it cost?", a: `The preview is free. The full report is a one-time ${SKUS.full_report.label} — no subscription, no account.` },
  { q: "What if my report can't be generated?", a: "If something fails after you pay, you're refunded automatically in full." },
  { q: "Is this therapy or relationship advice?", a: "No. It's an analysis of observable texting patterns. It won't diagnose anyone or tell you to stay or leave." },
];

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
      {
        "@type": "WebApplication",
        name: `${SITE_NAME} Relationship Text Analyzer`,
        url: SITE_URL,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: (SKUS.full_report.cents / 100).toFixed(2), priceCurrency: "USD" },
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />

      <section className="grid items-center gap-10 pt-12 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <p className="eyebrow">Stop guessing what he thinks</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
            What does he <em className="text-rose">really</em> think?
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Upload your chat and see what his texting behavior is actually showing.
          </p>
          <p className="mt-3 text-lg font-medium">
            Who initiates. How much effort he gives. When his energy changed. Whether the signals are actually mixed.
          </p>
          <div className="mt-8">
            <CtaLink>Analyze our chat</CtaLink>
            <CtaNote />
          </div>
        </div>
        <SampleCard kind="shift" caption="Every full report shows the week his behavior changed — and the numbers behind it." />
      </section>

      <div className="mx-auto max-w-3xl space-y-20 pb-8">
        <section aria-labelledby="questions-title">
          <h2 id="questions-title" className="font-display text-3xl font-semibold">
            Start from your question
          </h2>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {LANDING_PAGES.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 transition hover:border-rose/50"
              >
                <span className="font-medium">{p.eyebrow}</span>
                <ArrowRightIcon className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-rose" />
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-title">
          <h2 id="how-title" className="font-display text-3xl font-semibold">
            How it works
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="num text-sm text-rose">0{i + 1}</span>
                <p className="mt-1 text-lg font-semibold">{t}</p>
                <p className="mt-1 text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="pattern-title" className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 id="pattern-title" className="font-display text-3xl font-semibold">
              Don't analyze one text. Analyze the pattern.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">
              A screenshot shows a moment. Months of messages show a pattern: the week he stopped starting conversations,
              when his replies slowed, whether plans turned vague. We compare every week with the four before and after
              it to find when things actually changed — and show you the messages from both sides of the line.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">
              Every finding separates <strong className="text-ink">what the data shows</strong> from{" "}
              <strong className="text-ink">what it may mean</strong>. No tarot, no mind reading.
            </p>
          </div>
          <SampleCard kind="mixed" caption="Words vs actions, side by side." />
        </section>

        <section aria-labelledby="report-title">
          <h2 id="report-title" className="font-display text-3xl font-semibold">
            What's in the full report
          </h2>
          <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {MODULES.map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="num mt-0.5 text-sm text-rose">0{i + 1}</span>
                <span>
                  <span className="font-semibold">{t}</span>
                  <span className="mt-0.5 block text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <PrivacyPromises />

        <section aria-labelledby="pricing-title">
          <h2 id="pricing-title" className="font-display text-3xl font-semibold">
            Simple pricing
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card px-6 py-6">
              <p className="font-semibold">Free preview</p>
              <p className="num mt-1 text-4xl font-semibold">$0</p>
              <ul className="mt-4 space-y-2 text-sm">
                {["Message and activity stats", "Who starts conversations", "Reply times, you vs him", "The biggest change we found"].map((x) => (
                  <li key={x} className="flex gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-ok" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card border-rose px-6 py-6 ring-1 ring-rose">
              <p className="font-semibold">Full report</p>
              <p className="num mt-1 text-4xl font-semibold">{SKUS.full_report.label}</p>
              <p className="text-sm text-muted">One-time payment · No subscription</p>
              <ul className="mt-4 space-y-2 text-sm">
                {["Everything in the preview", "All 6 report sections", "Week-by-week timeline", "Mixed signals, both columns", "The supporting messages", "One question worth asking him"].map((x) => (
                  <li key={x} className="flex gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-ok" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="tools-title">
          <h2 id="tools-title" className="font-display text-2xl font-semibold">
            Free tools
          </h2>
          <p className="mt-2 text-muted">
            Just want one number? Use the{" "}
            <Link href="/tools/who-texts-first" className="text-rose underline underline-offset-2">
              who texts first calculator
            </Link>{" "}
            or the{" "}
            <Link href="/tools/reply-time-calculator" className="text-rose underline underline-offset-2">
              reply time calculator
            </Link>{" "}
            — free, and nothing leaves your device.
          </p>
        </section>

        <Faq items={FAQ} />

        <section className="text-center">
          <h2 className="font-display text-4xl font-semibold">Stop guessing. Read the signals.</h2>
          <div className="mt-6">
            <CtaLink>Analyze our chat</CtaLink>
            <CtaNote />
          </div>
        </section>
      </div>
    </main>
  );
}
