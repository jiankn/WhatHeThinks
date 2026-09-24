import { freeFinding } from "@/lib/report/presentation";
import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtInt, fmtMinutes, fmtPct, fmtRange } from "@/lib/format";
/** 预览页顶部的一行：标签与消息数。页面的 h1 是报告标题（在 PreviewTeaser 里）。 */
export function PreviewHeading({ preview: p, sample = false }: { preview: Preview; sample?: boolean }) {
  return <div className="reader-topline reader-preview-top"><span className="v3-tag">{sample ? "Sample · fictional conversation" : "Your free preview"}</span><span>{fmtInt(p.totalMessages)} messages{!p.liteMode && <> · {fmtRange(p.range)}</>}</span></div>;
}
export function PreviewSection({ preview: p, compact = false }: { preview: Preview; compact?: boolean }) {
  if (compact) return <p className="report-meta">{fmtInt(p.totalMessages)} messages{!p.liteMode && <> · {fmtRange(p.range)}</>}</p>;
  const finding = freeFinding(p);
  const comparison = !p.liteMode ? p.headline?.comparison : undefined;
  return <section className="reader-free" aria-label="Your free findings"><h2>{finding.title}</h2><p>{finding.context}</p><dl className="reader-preview-metrics"><div><dt>{p.liteMode ? "His message share" : "He starts chats"}</dt><dd>{comparison ? <>{fmtPct(comparison.initiation.before)} <i>→</i> {fmtPct(comparison.initiation.after)}</> : fmtPct(p.liteMode ? p.messageShare.him : p.initiation.him)}</dd><small>{comparison ? "Before → after the change" : `You: ${fmtPct(p.liteMode ? p.messageShare.you : p.initiation.you)}`}</small></div><div><dt>{p.liteMode ? "His messages with questions" : "His typical reply"}</dt><dd>{p.liteMode ? fmtPct(p.questionRatio.him) : comparison ? <>{fmtMinutes(comparison.reply.before)} <i>→</i> {fmtMinutes(comparison.reply.after)}</> : fmtMinutes(p.medianReply.him)}</dd><small>{comparison ? "Before → after the change" : `You: ${p.liteMode ? fmtPct(p.questionRatio.you) : fmtMinutes(p.medianReply.you)}`}</small></div></dl></section>;
}
