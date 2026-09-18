import type { Metadata } from "next";
import { ToolPage, type ToolContent } from "@/components/tools/ToolPage";

const c: ToolContent = {
  path: "/tools/reply-time-calculator",
  tool: "reply-time",
  name: "Reply Time Calculator",
  eyebrow: "Free tool",
  h1: "Reply time calculator: how fast does he really reply?",
  lede:
    "Upload your WhatsApp chat and get each person's typical reply time, how slow the slow replies get, and how his reply speed changed month by month. Free, and it runs entirely on your device.",
  method: [
    { name: "What counts as a reply", how: "The time from the last message in your turn to the first message of his next turn — only within the same conversation (under 6 hours apart)." },
    { name: "Why the median", how: "One reply after a flight or a long workday shouldn't skew the result, so we use the median (typical) reply, not the average." },
    { name: "Slow replies", how: "The 75th and 90th percentiles show how slow his slower replies get — useful when “he usually replies fast, except…”." },
  ],
  answers: [
    {
      q: "What is a normal reply time when dating?",
      a: "There isn't one number — it depends on jobs, habits and how you both text. Instead of comparing him to a rule, compare him to himself: a steady slow texter is different from someone whose replies went from minutes to hours.",
    },
    {
      q: "Does a slower reply time mean he's losing interest?",
      a: "Not by itself. Reply time is one of several signals. It means more when it slows alongside other changes — fewer conversations started, fewer questions, vaguer plans — and when the change lasts for weeks, not days.",
    },
  ],
  faq: [
    { q: "Is my chat uploaded?", a: "No. The calculation happens in your browser and nothing is sent to our servers." },
    { q: "Why doesn't it count overnight gaps?", a: "Messages more than 6 hours apart start a new conversation, so sleeping on a message doesn't count as a slow reply." },
    { q: "Can I see when his replies slowed down?", a: "The tool shows his typical reply time by month. The full analysis pinpoints the week it changed and what else changed with it." },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Reply Time Calculator — How Fast Does He Really Reply?" },
  description: "Calculate typical reply times for you and him from your WhatsApp chat, plus how his replies changed month by month. Free and private.",
  alternates: { canonical: c.path },
};

export default function Page() {
  return <ToolPage c={c} />;
}
