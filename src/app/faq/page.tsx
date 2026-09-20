import type { Metadata } from "next";
import Link from "next/link";
import { CtaLink, CtaNote } from "@/components/marketing/CtaLink";
import { Faq } from "@/components/marketing/Faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "How WhatHeThinks analyzes your chat, what it can and can't tell you, privacy, pricing and refunds.",
  alternates: { canonical: "/faq" },
};

const SECTIONS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "How it works",
    items: [
      { q: "What does the analysis look at?", a: "Observable behavior in your chat: who starts conversations (after 6+ hours of silence), reply times within conversations, questions, concrete and vague plans, affectionate messages, one-word replies, and how all of these change week by week." },
      { q: "How do you find when things changed?", a: "For every week, we compare the four weeks before with the four weeks after across seven behaviors. When several move together strongly enough, we mark a turning point, pinpoint the day and rate our confidence as high, medium or low." },
      { q: "What can't it tell me?", a: "What he thinks or feels, what happens offline, and what will happen next. Texts don't show calls, in-person time, stress at work or conversations in other apps. That's why every finding separates what the data shows from what it may mean." },
      { q: "How many messages do I need?", a: "At least 50. To detect turning points, you need three or more weeks of history and roughly 300 messages." },
      { q: "Which formats are supported?", a: "WhatsApp exports (.txt or .zip) from iPhone and Android, in US and international date formats, 12- or 24-hour time. You can also paste text; without timestamps you'll get a lite analysis with no timeline." },
    ],
  },
  {
    title: "Privacy",
    items: [
      { q: "Is my chat uploaded?", a: "No. Your chat is read and analyzed in your browser. To create your report we send statistics plus up to 120 example messages, with names, emails, phone numbers and links replaced." },
      { q: "How long do you keep my data?", a: "Example messages are deleted automatically after 30 days. Your report's statistics and findings stay until you delete the report." },
      { q: "How do I delete my report?", a: "If you have an account, manage and delete reports from My account. Guest reports can still be deleted from the report page or with the private report link. Deletion is immediate and permanent." },
      { q: "How is the report written?", a: "The current version uses measured chat statistics and structured explanations. It does not send your messages to an external language model or use them to train a model." },
      { q: "Can I share the result?", a: "Yes, including your free preview. Preview a summary card, choose whether to include statistics, then download an image or publish a link. No names or message excerpts are included. Links expire after 30 days and can be revoked from your report." },
    ],
  },
  {
    title: "Pricing",
    items: [
      { q: "What's free?", a: "The preview: message and activity stats, who starts conversations, typical reply times and the biggest change we found." },
      { q: "When do I see the price?", a: "After you read your free preview. If you decide to unlock the full report, you'll see the price clearly before checkout. It is one payment, with no subscription." },
      { q: "Can I get a refund?", a: "If your report can't be generated after payment, you'll receive an automatic full refund. Once the full report has been generated and made available to you, the purchase is final because it is an immediately delivered digital product. We don't offer refunds for a change of mind or because you disagree with the report's interpretation. This does not affect any rights you have under applicable law." },
      { q: "How do I get back to my report?", a: "If you are signed in, your reports appear in My account. Otherwise, your private report link is saved in your browser and emailed after purchase — keep it private." },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 pb-8">
      <p className="eyebrow">Help</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Questions before you bring the chat?</h1>
      <p className="mt-3 text-muted">
        Short version: we analyze his texting behavior, not his mind — and your full chat never leaves your device. More
        detail in our <Link href="/privacy" className="text-rose underline underline-offset-2">privacy policy</Link>.
      </p>
      <div className="mt-10 space-y-12">
        {SECTIONS.map((s) => (
          <Faq key={s.title} title={s.title} items={s.items} />
        ))}
      </div>
      <div className="mt-14 text-center">
        <CtaLink>Analyze our chat</CtaLink>
        <CtaNote />
      </div>
    </main>
  );
}
