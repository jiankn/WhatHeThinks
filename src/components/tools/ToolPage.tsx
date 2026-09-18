/** 免费工具页的服务端外壳：说明文字、方法、FAQ 都在 HTML 中，只有工具本身在客户端运行。 */

import Link from "next/link";
import { Faq } from "@/components/marketing/Faq";
import { jsonLdHtml, SITE_NAME, SITE_URL } from "@/lib/site";
import { ToolWidget } from "./ToolWidget";

export interface ToolContent {
  path: string;
  tool: "who-texts-first" | "reply-time";
  name: string;
  eyebrow: string;
  h1: string;
  lede: string;
  method: { name: string; how: string }[];
  answers: { q: string; a: string }[];
  faq: { q: string; a: string }[];
}

export function ToolPage({ c }: { c: ToolContent }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: c.name,
        url: `${SITE_URL}${c.path}`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: c.name, item: `${SITE_URL}${c.path}` },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-semibold sm:text-5xl">{c.h1}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{c.lede}</p>

      <div className="mt-8">
        <ToolWidget tool={c.tool} />
      </div>

      <div className="mt-16 space-y-14">
        <section aria-labelledby="method-title">
          <h2 id="method-title" className="font-display text-2xl font-semibold sm:text-3xl">
            How we calculate it
          </h2>
          <dl className="mt-5 space-y-4">
            {c.method.map((m) => (
              <div key={m.name} className="border-l-2 border-rose/40 pl-4">
                <dt className="font-semibold">{m.name}</dt>
                <dd className="mt-0.5 text-muted">{m.how}</dd>
              </div>
            ))}
          </dl>
        </section>

        {c.answers.map((a) => (
          <section key={a.q}>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{a.q}</h2>
            <p className="mt-3 text-[17px] leading-relaxed">{a.a}</p>
          </section>
        ))}

        <p className="text-muted">
          One number rarely tells the whole story. If you&apos;re wondering whether something changed, the{" "}
          <Link href="/is-he-losing-interest" className="text-rose underline underline-offset-2">
            losing interest analysis
          </Link>{" "}
          looks at initiation, replies, questions and plans together — and finds the week they shifted.
        </p>

        <Faq items={c.faq} />
      </div>
    </main>
  );
}
