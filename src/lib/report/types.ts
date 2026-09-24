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
  /** v3 起：按章节讲的故事式解读。有它时页面按故事渲染。 */
  story?: ReportStory;
  /** v2 的英文分栏解读。旧报告才有。 */
  narrative?: ReportNarrative;
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

export interface GroundedClaim extends Claim {
  /** An exact, server-computed fact, or null for an observation grounded in messages. */
  factId: string | null;
}

/** 一种常见解释：放在“这种模式通常意味着什么”里，只描述行为，不读心。 */
export interface PatternReading {
  name: string;
  fit: "stronger" | "possible" | "weaker";
  why: string;
  evidenceIds: number[];
}

export interface MessageOption {
  tone: "warm" | "direct" | "light";
  text: string;
}

export interface ReportNarrative {
  language: "en";
  question: string;
  headline: string;
  answer: string;
  supporting: GroundedClaim[];
  counterEvidence: GroundedClaim[];
  counterEvidenceNote: string;
  misread: string;
  limitation: string;
  /** v2（expert）起才有；旧报告没有这些字段，页面按有无渲染。 */
  meaning?: { patterns: PatternReading[]; lean: string };
  yourSide?: string;
  nextStep: {
    question: string;
    why: string;
    howToAsk: string;
    watchFor: string;
    responseGuide: "plans" | "conversation";
    messageOptions?: MessageOption[];
    avoid?: string;
    plan?: string;
  };
}

/** 故事里的一段：正文，或引用一条证据（页面按原消息渲染成聊天气泡）。 */
export type StoryBlock = { p: string } | { quote: number };

export interface StoryChapter {
  /** 与服务器给出的章节一一对应（c1、c2…），span 由服务器写入。 */
  id: string;
  span: string;
  emoji: string;
  title: string;
  blocks: StoryBlock[];
}

export interface ReportStory {
  language: "en";
  question: string;
  /** 她的名字，服务器写入，用于把证据里的 [you] 换回名字显示。 */
  youName?: string;
  title: string;
  opening: string[];
  chapters: StoryChapter[];
  turn: { text: string; evidenceIds: number[] };
  otherReading: string;
  read: string;
  yourSide: string;
  nextStep: ReportNarrative["nextStep"] & { messageOptions: MessageOption[]; avoid: string; plan: string };
  signoff: string;
}

/** 付款前写好的标题与开头（免费预览展示其前一部分）。付款后的完整报告原样沿用。 */
export interface StoryTeaser {
  title: string;
  opening: string[];
  model: string;
  generatedAt: number;
}
