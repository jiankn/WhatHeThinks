import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtMinutes, fmtPct } from "@/lib/format";

export interface ShareSnapshot {
  version: 1;
  headline: string;
  metrics: Array<{ label: string; value: string }>;
  note: string;
  /** 付费报告的标题，仅在用户勾选后出现。 */
  quote?: string;
}

export const QUOTE_LABEL = "What my report said";
export const SHARE_CTA = "Curious what your own chat shows?";

/** 报告标题经 You/Him 约束生成、不含名字；这里再压空白、限长，防止撑破图片。 */
export function shareQuote(headline: string | null | undefined): string | undefined {
  const text = headline?.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 180 ? `${text.slice(0, 179).trimEnd()}…` : text;
}

export function buildShareSnapshot(p: Preview, showMetrics = true, reportHeadline?: string | null): ShareSnapshot {
  const quote = shareQuote(reportHeadline);
  const snapshot = buildMeasuredSnapshot(p, showMetrics);
  return quote ? { ...snapshot, quote } : snapshot;
}

function buildMeasuredSnapshot(p: Preview, showMetrics: boolean): ShareSnapshot {
  // Measured part never copies a generated sentence, date, name, excerpt or report id.
  // The only generated text is the report headline, and only when the owner opts in.
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
  // A reply or initiation headline uses its own comparison; a volume headline has no value of
  // its own on the card, so it shows whichever measured comparison changed the most.
  const metric = p.headline?.metric;
  const candidates = (metric === "reply" ? ["reply"] : metric === "initiation" ? ["initiation"]
    : metric === "volume" ? ["reply", "initiation"] : []) as Array<"reply" | "initiation">;
  const changes = candidates.flatMap(kind => {
    const c = p.headline?.comparison?.[kind];
    if (!c || !Number.isFinite(c.before) || !Number.isFinite(c.after) || c.before < 0 || c.after < 0) return [];
    if (kind === "initiation" && (c.before > 1 || c.after > 1)) return [];
    const format = kind === "reply" ? fmtMinutes : fmtPct;
    if (format(c.before) === format(c.after)) return [];
    return [{ kind, ...c, before: format(c.before), after: format(c.after), shift: Math.abs(c.after - c.before) / Math.max(c.before, c.after) }];
  }).sort((a, b) => b.shift - a.shift);
  const change = changes[0];
  if (change) {
    const up = p.headline!.comparison![change.kind].after > p.headline!.comparison![change.kind].before;
    snapshot.headline = change.kind === "reply"
      ? up ? "His replies got slower." : "His replies got faster."
      : up ? "He started a greater share of our conversations." : "He started a smaller share of our conversations.";
    const label = change.kind === "reply" ? "His median reply" : "Chats he started";
    snapshot.metrics = [{ label: `${label} · before`, value: change.before }, { label: `${label} · after`, value: change.after }];
    return snapshot;
  }
  if (p.initiation.you + p.initiation.him > 0) {
    snapshot.headline = p.initiation.you >= .45 && p.initiation.you <= .55
      ? "We start conversations about equally."
      : p.initiation.you > p.initiation.him ? "I start more of our conversations." : "He starts more of our conversations.";
  }
  return snapshot;
}
