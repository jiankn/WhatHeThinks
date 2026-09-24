import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtInt, fmtRange } from "@/lib/format";
/** 预览页顶部的一行：标签与消息数。页面的 h1 是报告标题（在 PreviewTeaser 里）。 */
export function PreviewHeading({ preview: p, sample = false }: { preview: Preview; sample?: boolean }) {
  return <div className="reader-topline reader-preview-top"><span className="v3-tag">{sample ? "Sample · fictional conversation" : "Your free preview"}</span><span>{fmtInt(p.totalMessages)} messages{!p.liteMode && <> · {fmtRange(p.range)}</>}</span></div>;
}
