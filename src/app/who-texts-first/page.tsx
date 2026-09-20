import type { Metadata } from "next";
import { ToolPage, type ToolContent } from "@/components/tools/ToolPage";

const c: ToolContent = {
  path: "/who-texts-first",
  tool: "who-texts-first",
  name: "Who Texts First Calculator",
  h1: "Who texts first more?",
  lede: "Add your WhatsApp chat and see who starts more of your conversations, month by month. Free and private.",
  faq: [
    {
      q: "What counts as starting a conversation?",
      a: "Whoever sends the first message after 6+ hours of silence. A “good morning” after a normal night's sleep isn't counted, and photos, voice notes and calls count as reaching out.",
    },
    { q: "Is my chat uploaded?", a: "No. The tool reads your chat in your browser. Nothing is sent to our servers." },
    {
      q: "Does it matter who texts first?",
      a: "On its own, not much. It matters when it's lopsided for months, or when it changes: going from half your conversations to one in five means more than the number itself.",
    },
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
