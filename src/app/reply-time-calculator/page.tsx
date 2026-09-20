import type { Metadata } from "next";
import { ToolPage, type ToolContent } from "@/components/tools/ToolPage";

const c: ToolContent = {
  path: "/reply-time-calculator",
  tool: "reply-time",
  name: "Reply Time Calculator",
  h1: "How fast does he really reply?",
  lede: "Add your WhatsApp chat and see his typical reply time, yours, and how his changed month by month. Free and private.",
  faq: [
    {
      q: "What counts as a reply?",
      a: "The time from your last message to his next one, within the same conversation. Gaps of 6+ hours start a new conversation, so sleeping on a message isn't a slow reply. We use the typical (median) reply so one long delay doesn't skew it.",
    },
    { q: "Is my chat uploaded?", a: "No. The tool reads your chat in your browser. Nothing is sent to our servers." },
    {
      q: "Does a slower reply mean he's losing interest?",
      a: "Not by itself. It means more when it slows for weeks alongside other changes, like fewer conversations started or fewer plans.",
    },
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
