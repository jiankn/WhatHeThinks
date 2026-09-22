/**
 * 分析等待页上逐条揭晓的"发现"。全部取自本地分析结果，不编造；
 * 转折点只说日期不说方向，把悬念留给报告页。
 */

import type { Analysis } from "@/lib/analysis/analysis-types";
import { fmtDate, fmtInt, fmtPct } from "@/lib/format";

export interface Findings {
  parsing: string;
  sessions: string;
  trends: string;
  turning: string;
  evidence: string;
  /** 最近最多 16 周的消息量，归一化到 0–1，用于迷你柱状图。 */
  weekly: number[];
  /** 最多 3 条证据消息的打码版本。 */
  receipts: { mine: boolean; text: string }[];
}

/** 只留第一个词，其余词换成等长（最多 6 个）的遮挡块。 */
function mask(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 7);
  return words.map((w, i) => (i === 0 && w.length <= 12 ? w : "█".repeat(Math.min(6, Math.max(2, w.length))))).join(" ");
}

export function buildFindings(a: Analysis, himName: string): Findings {
  const p = a.preview;
  const lite = p.liteMode;

  const parsing = p.activeDays
    ? `${fmtInt(p.totalMessages)} messages over ${fmtInt(p.activeDays)} active days`
    : `${fmtInt(p.totalMessages)} messages`;

  const sessions = lite
    ? `You sent ${fmtPct(p.messageShare.you)} of messages, ${himName} sent ${fmtPct(p.messageShare.him)}`
    : `${fmtInt(a.totalSessions)} separate conversations · ${himName} started ${fmtPct(p.initiation.him)}`;

  const recent = a.weeks.slice(-16).map((w) => w.total);
  const peak = Math.max(1, ...recent);
  const weekly = lite ? [] : recent.map((t) => t / peak);
  const trends = lite || !a.weeks.length
    ? "No timestamps, so we compared overall balance instead"
    : `${fmtInt(a.weeks.length)} ${a.weeks.length === 1 ? "week" : "weeks"} measured side by side`;

  const shiftDate = p.headline?.date ?? a.turningPoints[0]?.date;
  const turning = shiftDate
    ? `Something shifted around ${fmtDate(shiftDate)}`
    : !a.enoughForTurningPoints
      ? "Not enough history yet for a clear turning point"
      : "No sharp break. The pattern holds fairly steady";

  const evidence = a.evidence.length
    ? `${fmtInt(a.evidence.length)} ${a.evidence.length === 1 ? "moment" : "moments"} saved as receipts`
    : "Few standout moments, so the numbers will lead";

  const receipts = a.evidence
    .filter((m) => m.text.trim())
    .slice(0, 3)
    .map((m) => ({ mine: m.sender === "Y", text: mask(m.text) }));

  return { parsing, sessions, trends, turning, evidence, weekly, receipts };
}
