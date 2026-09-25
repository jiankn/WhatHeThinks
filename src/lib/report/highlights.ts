/**
 * 报告里的"一目了然"：关键日期（聊天开始、最热闹的一周、转折、他最后一次提出具体计划、聊天结束）
 * 和反复出现的话（谁说的、几次、几周、第一次和最近一次）。全部由程序从分析数据算出，不经过模型。
 */

import type { ReportHighlights, TPNarrative } from "./types";
import type { SlimAnalysis } from "./payload";
import type { EvidenceMsg } from "@/lib/analysis/analysis-types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 他最后一次提出具体计划离聊天结束不到两周时不单独列出：那只是最近的日常。 */
const LAST_PLAN_GAP_MS = 14 * DAY_MS;
const MAX_LINES = 8;

export function buildHighlights(analysis: SlimAnalysis, evidence: EvidenceMsg[], points: TPNarrative[]): ReportHighlights {
  const byId = new Map(evidence.map(e => [e.id, e]));
  const lines = (analysis.recurring ?? [])
    .map(r => ({ r, found: r.ids.map(id => byId.get(id)).filter((e): e is EvidenceMsg => Boolean(e)) }))
    .filter(({ found }) => found.length > 0)
    .sort((a, b) => b.r.weeks - a.r.weeks || b.r.count - a.r.count)
    .slice(0, MAX_LINES)
    .map(({ r, found }) => ({
      from: r.sender === "Y" ? "you" as const : "him" as const,
      evidenceId: found[0].id, times: r.count, weeks: r.weeks,
      // 浏览器分析时从整段聊天记下的首尾日期；旧分析没有就不显示日期
      ...(r.firstTs !== undefined && r.lastTs !== undefined && r.firstTs < r.lastTs ? { firstTs: r.firstTs, lastTs: r.lastTs } : {}),
    }));
  if (analysis.preview.liteMode) return { milestones: [], lines };

  const [start, end] = analysis.range;
  const milestones: ReportHighlights["milestones"] = [{ date: start, kind: "start", text: "Your chat starts." }];
  const weeks = analysis.weeks;
  if (weeks.length >= 3) {
    const busiest = weeks.reduce((a, b) => (b.total > a.total ? b : a));
    milestones.push({ date: Math.max(start, busiest.weekStart), kind: "busiest", week: true, text: `The busiest week: ${busiest.total} messages between you.` });
  }
  for (const p of points) milestones.push({ date: p.date, kind: "shift", text: p.title, rows: p.rows });
  const lastPlan = [...weeks].reverse().find(w => w.H.plansConcrete > 0);
  if (lastPlan && end - lastPlan.weekStart >= LAST_PLAN_GAP_MS) {
    milestones.push({ date: Math.max(start, lastPlan.weekStart), kind: "lastPlan", week: true, text: "The last week he suggested a concrete plan." });
  }
  milestones.push({ date: end, kind: "end", text: "Your chat ends here." });
  milestones.sort((a, b) => a.date - b.date);
  return { milestones, lines };
}
