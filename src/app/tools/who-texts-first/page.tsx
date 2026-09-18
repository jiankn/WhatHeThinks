import type { Metadata } from "next";
import { ToolPage, type ToolContent } from "@/components/tools/ToolPage";

const c: ToolContent = {
  path: "/tools/who-texts-first",
  tool: "who-texts-first",
  name: "Who Texts First Calculator",
  eyebrow: "Free tool",
  h1: "Who texts first? Calculate it from your chat.",
  lede:
    "Upload your WhatsApp chat and see what share of your conversations each of you started — overall and month by month. Free, instant, and it runs entirely on your device.",
  method: [
    { name: "What counts as a conversation", how: "A new conversation begins when there's been 6 hours or more of silence. Whoever sends the first message after that gap started it." },
    { name: "Overnight gaps", how: "A “good morning” after a normal night's sleep is counted separately, so routine morning texts don't inflate anyone's number." },
    { name: "Media and calls", how: "Photos, voice notes and missed calls count as reaching out. Deleted messages don't count." },
  ],
  answers: [
    {
      q: "Does it matter who texts first?",
      a: "On its own, not much — some people just prefer to reply. It matters when it's lopsided for a long time, or when it changes: if he used to start about half your conversations and now starts one in five, that shift is more meaningful than the number itself.",
    },
    {
      q: "What's a healthy balance?",
      a: "There's no universal normal. Many couples settle somewhere between a 40/60 and 60/40 split. What's worth noticing is a split far outside that range that stays there — or a sudden change in who reaches out.",
    },
  ],
  faq: [
    { q: "Is my chat uploaded?", a: "No. This tool reads your chat in your browser and nothing is sent to our servers." },
    { q: "How do I export my WhatsApp chat?", a: "iPhone: open the chat, tap his name, then Export Chat → Without Media. Android: open the chat, tap ⋮ → More → Export chat → Without media." },
    { q: "Can I see how it changed over time?", a: "Yes — the tool shows the split month by month. For the exact week things changed, use the full analysis." },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Who Texts First Calculator — WhatsApp Chat, Free & Private" },
  description: "See who starts more conversations in your WhatsApp chat, overall and by month. Free, instant, and your chat never leaves your device.",
  alternates: { canonical: c.path },
};

export default function Page() {
  return <ToolPage c={c} />;
}
