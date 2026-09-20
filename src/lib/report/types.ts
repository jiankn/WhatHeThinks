/**
 * 完整报告结构（6 个模块）。详见 docs/prompt-architecture.md §3、PRD §5.5。
 * mock 与未来的 LLM ReportWriter 都输出此结构，并经过 Claim Checker。
 */

import type { InterestLevel, TurningPoint } from "@/lib/analysis/analysis-types";

export type Confidence = "high" | "medium" | "low";

/** 一条结论：事实与解读分离，必须带数字、日期或证据之一。 */
export interface Claim {
  fact: string;
  interpretation?: string;
  confidence: Confidence;
  evidenceIds: number[];
}

export interface Dim {
  key: "initiative" | "curiosity" | "engagement" | "planning" | "followThrough";
  label: string;
  level: "high" | "moderate" | "low" | "insufficient";
  score: number | null;
  sentence: string;
}

export interface InvestRow {
  key: string;
  label: string;
  you: number;
  him: number;
  /** 展示格式：pct = 0–1 占比；count = 次数；minutes = 分钟；chars = 字符数。 */
  format: "pct" | "count" | "minutes" | "chars";
  /** 数值越大代表投入越多（回复时间则相反）。 */
  higherIsMore: boolean;
}

export interface BeforeAfterRow {
  label: string;
  before: string;
  after: string;
}

export interface TPNarrative {
  id: string;
  date: number;
  direction: TurningPoint["direction"];
  confidence: Confidence;
  title: string;
  fact: string;
  interpretation: string;
  offlineCaveat: string;
  rows: BeforeAfterRow[];
  contextNote?: string;
  conflictNote?: string;
  evidenceIds: number[];
}

/** 时间线图表的一个周数据点（仅非稀疏周）。 */
export interface SeriesPoint {
  weekStart: number;
  himInitShare: number | null;
  himReplyMin: number | null;
  himMsgShare: number;
  total: number;
}

export type ModuleKey = "summary" | "interest" | "investment" | "timeline" | "mixedSignals" | "nextStep";

export interface FullReport {
  summary: { headline: string; paragraphs: string[]; claims: Claim[] };
  interest: { level: InterestLevel; trendDeclining: boolean; dimensions: Dim[]; note: string; claims: Claim[] };
  investment: { rows: InvestRow[]; takeaway: string; claims: Claim[] };
  timeline: { points: TPNarrative[]; series: SeriesPoint[]; emptyNote?: string };
  mixedSignals: { interest: Claim[]; distance: Claim[]; combination: string; breadcrumbing: boolean };
  nextStep: { question: string; why: string; howToAsk: string; responseGuide?: "plans" | "conversation" };
  /** 模块展示顺序，按用户选的问题调整（prompt-architecture §7）。 */
  order: ModuleKey[];
  meta: { writer: "mock" | "llm"; model?: string; version: string; generatedAt: number };
}
