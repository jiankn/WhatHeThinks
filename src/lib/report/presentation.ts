import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtPct } from "@/lib/format";
import type { QuestionId } from "@/lib/questions";

export function freeFinding(p: Preview): { title: string; context: string } {
  if (!p.liteMode && p.headline) return {
    title: p.headline.sentence,
    context: "The measured change is shown below. It does not establish why things changed or what happened offline.",
  };
  const share = p.liteMode ? p.messageShare.you : p.initiation.you;
  const action = p.liteMode ? "sent more of the messages" : "started more of the conversations";
  const statement = p.liteMode ? `You sent ${fmtPct(share)} of the messages in this sample.` : `You started ${fmtPct(share)} of the conversations in this sample.`;
  return {
    title: share >= 0.6 ? `You ${action}.` : share <= 0.4 && (p.liteMode ? p.messageShare.him : p.initiation.him) >= 0.6 ? `He ${action}.` : "Here is how you share the conversation.",
    context: `${statement} ${p.liteMode ? "Without timestamps, we cannot establish reply times or changes over time." : "This describes who starts contact, not the quality of the connection or how either of you feels."}`,
  };
}

export const PURCHASE_FOCUS: Record<QuestionId, string> = {
  overview: "Understand the pattern, weigh the evidence, and decide what to ask next.",
  likes_me: "See whether his interest shows up in initiative and concrete actions, alongside the evidence that complicates the picture.",
  losing_interest: "Look at whether lower engagement is a sustained pattern, what points the other way, and how to raise it.",
  energy_changed: "Understand the changes the available messages show, the explanations they support, and what remains unknown.",
  mixed_signals: "Put affectionate words alongside concrete actions, and find a useful way to clarify the gap.",
  more_invested: "See how you each contribute beyond message counts, and how to ask for the consistency you need.",
  situationship: "Look at whether intentions turn into arrangements and follow-through, and prepare a conversation about what you want.",
  ex_came_back: "Look for evidence of changed behavior after reconnecting, and prepare a question about what would be different.",
  custom: "Get a direct response to your saved question, grounded in this chat, with a clear explanation of what the evidence cannot settle.",
};
