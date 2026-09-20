import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtMinutes, fmtPct } from "@/lib/format";

export interface ShareSnapshot {
  version: 1;
  headline: string;
  metrics: Array<{ label: string; value: string }>;
  note: string;
}
export function buildShareSnapshot(p: Preview, showMetrics = true): ShareSnapshot {
  // Deliberately do not copy a generated sentence, date, name, excerpt or report id.
  const headline = p.liteMode ? "A fresh look at our conversation."
    : p.headline?.direction === "warming" ? "The conversation is finding its momentum."
    : p.headline?.direction === "cooling" ? "The rhythm of our conversation changed."
    : "There’s a pattern behind the messages.";
  return { version: 1, headline, metrics: showMetrics ? [
    { label: p.liteMode ? "My share of messages" : "Chats I started", value: fmtPct(p.liteMode ? p.messageShare.you : p.initiation.you) },
    { label: p.liteMode ? "His messages with questions" : "His typical reply", value: p.liteMode ? fmtPct(p.questionRatio.him) : fmtMinutes(p.medianReply.him) },
  ] : [], note: "Based on texting patterns. Feelings need a conversation." };
}
