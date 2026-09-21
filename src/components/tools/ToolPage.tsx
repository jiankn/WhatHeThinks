/** 免费工具页的服务端外壳：一句话说明 + 工具 + 折叠 FAQ。只有工具本身在客户端运行。 */

import Link from "next/link";
import { Faq } from "@/components/marketing/Faq";
import { jsonLdHtml, SITE_NAME, SITE_URL } from "@/lib/site";
import { ToolWidget } from "./ToolWidget";

export interface ToolContent {
  path: string;
  tool: "who-texts-first" | "reply-time";
  name: string;
  h1: string;
  lede: string;
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
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <p className="eyebrow">Free tool</p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-semibold sm:text-5xl">{c.h1}</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">{c.lede}</p>

      <div className="mt-8">
        <ToolWidget tool={c.tool} />
      </div>

      <div className="mt-14">
        <section className="mb-8"><h2 className="text-2xl font-semibold">Put the number in context</h2><p className="mt-3 leading-relaxed text-muted">{c.tool === "who-texts-first" ? "Starting fewer chats does not measure how much someone cares. Compare similar periods and remember calls, time together and messages outside this export. Use a change as a reason to talk, not as a score for the relationship." : "A typical reply time is a description, not a deadline someone owes you. Sleep, work, time zones and the kind of message all matter. Compare your own usual rhythm before interpreting a change."}</p><p className="mt-3"><Link href="/texting-styles" className="underline underline-offset-4">Understand different texting styles</Link>{" · "}<Link href={c.tool === "who-texts-first" ? "/relationship-check-in-questions" : "/left-on-read"} className="underline underline-offset-4">{c.tool === "who-texts-first" ? "Prepare a relationship check-in" : "What being left on read can mean"}</Link></p></section>
        <Faq items={c.faq} />
        <p className="mt-6 text-sm text-muted">
          Want more than one number? The{" "}
          <Link href="/is-he-losing-interest" className="text-rose underline underline-offset-2">
            losing interest analysis
          </Link>{" "}
          looks at replies, initiation, questions and plans together.
        </p>
      </div>
    </main>
  );
}
