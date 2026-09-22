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
  const note = "Texting patterns don’t tell the whole story.";
  if (!showMetrics) return { version: 1, headline: "A fresh look at our conversation.", metrics: [], note };
  const snapshot: ShareSnapshot = { version: 1, headline: "A snapshot of our conversation.", metrics: [
    { label: p.liteMode ? "My share of messages" : "Chats I started", value: fmtPct(p.liteMode ? p.messageShare.you : p.initiation.you) },
    { label: p.liteMode ? "His messages with questions" : "His median reply time", value: p.liteMode ? fmtPct(p.questionRatio.him) : fmtMinutes(p.medianReply.him) },
  ], note };
  if (p.liteMode || p.totalMessages < 10 || p.activeDays < 2) {
    snapshot.headline = "A small sample of our conversation.";
    snapshot.note = "A limited sample. Texting patterns don’t tell the whole story.";
    return snapshot;
  }
  // Only describe changes supported by the measured values shown on this card.
  const metric = p.headline?.metric;
  const comparison = metric === "reply" ? p.headline?.comparison?.reply
    : metric === "initiation" ? p.headline?.comparison?.initiation : undefined;
  if (comparison && Number.isFinite(comparison.before) && Number.isFinite(comparison.after)
    && comparison.before >= 0 && comparison.after >= 0
    && (metric !== "initiation" || (comparison.before <= 1 && comparison.after <= 1))) {
    const format = metric === "reply" ? fmtMinutes : fmtPct;
    const before = format(comparison.before);
    const after = format(comparison.after);
    if (before !== after) {
      snapshot.headline = metric === "reply"
        ? comparison.after > comparison.before ? "His replies got slower." : "His replies got faster."
        : comparison.after > comparison.before ? "He started a greater share of our conversations." : "He started a smaller share of our conversations.";
      const label = metric === "reply" ? "His median reply" : "Chats he started";
      snapshot.metrics = [{ label: `${label} · before`, value: before }, { label: `${label} · after`, value: after }];
      return snapshot;
    }
  }
  if (p.initiation.you + p.initiation.him > 0) {
    snapshot.headline = p.initiation.you >= .45 && p.initiation.you <= .55
      ? "We start conversations about equally."
      : p.initiation.you > p.initiation.him ? "I start more of our conversations." : "He starts more of our conversations.";
  }
  return snapshot;
}
