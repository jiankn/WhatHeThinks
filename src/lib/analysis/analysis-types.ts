/**
 * 分析引擎的输出类型。详见 docs/signal-scoring-spec.md。
 * 全流程只认 "Y"（用户本人）与 "H"（对方）两个角色。
 */

export type Role = "Y" | "H";

/** §2 会话 */
export interface Session {
  startIdx: number; // messages 下标
  endIdx: number;
  startTs: number;
  endTs: number;
  initiator: Role;
  /** 距上一会话 ≥ 48h 后开启。 */
  isReengage: boolean;
  /** 由夜间空档（跨 00:00–06:00 且 <12h）切出，initiationShare 计算时排除。 */
  isOvernight: boolean;
}

/** §3 单人指标（全程或某周） */
export interface PersonMetrics {
  msgCount: number;
  textCount: number;
  words: number;
  avgLen: number;
  /** 开启的会话数（不含 overnight 切出的会话）。 */
  initiations: number;
  morningStarts: number;
  /** 回复延迟样本（毫秒）。 */
  replyLatencies: number[];
  replyP50: number; // 分钟
  replyP75: number;
  replyP90: number;
  unanswered: number;
  questions: number;
  questionRatio: number;
  ignoredQuestions: number;
  doubleTexts: number;
  activeDays: number;
  // 词典命中（绝对计数）
  plansConcrete: number;
  plansVague: number;
  plansCancel: number;
  affection: number;
  laughter: number;
  apology: number;
  support: number;
  busyExcuse: number;
  dry: number;
  conflict: number;
  /** 命中各类信号的 msgId，用于证据。 */
  hits: Record<string, number[]>;
}

/** §5 单周聚合 */
export interface WeekBucket {
  weekStart: number; // 该 ISO 周周一 00:00 的 ts
  total: number; // 双方消息合计
  sparse: boolean; // total < 10
  Y: PersonMetrics;
  H: PersonMetrics;
}

/** §6 转折点某侧的指标快照 */
export interface MetricSnapshot {
  initShare: number;
  replyP50: number;
  questionRatio: number;
  msgShare: number;
  avgLen: number;
  plansPerWeek: number;
  warmthRate: number;
  dryRate: number;
}

export interface TurningPoint {
  id: string;
  date: number;
  direction: "cooling" | "warming";
  confidence: "high" | "medium" | "low";
  shift: number;
  before: MetricSnapshot;
  after: MetricSnapshot;
  drivers: { metric: string; before: number; after: number; d: number }[];
  evidenceIds: number[];
  context: { yInitShareBefore: number; yInitShareAfter: number };
  conflictDate?: number;
  shiftBeforeConflict?: boolean;
}

export type InterestLevel = "strong" | "moderate" | "mixed" | "low";

export interface InterestDimension {
  key: "initiative" | "curiosity" | "engagement" | "planning" | "followThrough";
  score: number | null; // null = 数据不足
  label: "high" | "moderate" | "low" | "insufficient";
}

export interface Interest {
  level: InterestLevel;
  score: number;
  dimensions: InterestDimension[];
  trendDeclining: boolean;
}

export interface MixedSignalHit {
  id: string;
  side: "interest" | "distance";
  evidenceIds: number[];
}

export interface EvidenceMsg {
  id: number;
  ts: number;
  sender: Role;
  text: string;
}

export interface Preview {
  totalMessages: number;
  activeDays: number;
  range: [number, number];
  initiation: { you: number; him: number };
  medianReply: { you: number; him: number };
  /** 消息数占比（0–1），Lite 模式也可用。 */
  messageShare: { you: number; him: number };
  /** 文本消息中提问的比例（0–1）。 */
  questionRatio: { you: number; him: number };
  headline: {
    date: number;
    metric: "initiation" | "reply" | "volume";
    /** 旧报告没有此字段。 */
    direction?: "cooling" | "warming";
    sentence: string;
    /** Measured values around this shift; optional for reports created before the redesign. */
    comparison?: {
      initiation: { before: number; after: number };
      reply: { before: number; after: number };
    };
  } | null;
  counts: {
    turningPoints: number;
    mixedSignals: number;
    evidence: number;
    shifts: number;
  };
  liteMode: boolean;
}

/** analyze() 的完整输出。 */
/** 同一人在多个不同周几乎逐字重复的一句话。ids：首次与最近两次出现。 */
/** 一条证据消息在整段聊天里出现的次数与周数（无时间戳时 weeks 为 0）。 */
export interface RepeatInfo {
  id: number;
  times: number;
  weeks: number;
}

export interface RecurringLine {
  sender: Role;
  count: number;
  weeks: number;
  ids: number[];
  /** 第一次与最近一次出现的时间（较新的分析才有）：上传时 ids 会按证据筛掉一部分，不能拿它们推算。 */
  firstTs?: number;
  lastTs?: number;
}

export interface Analysis {
  totals: { Y: PersonMetrics; H: PersonMetrics };
  totalSessions: number;
  range: [number, number];
  activeDays: number;
  weeks: WeekBucket[];
  turningPoints: TurningPoint[];
  interest: Interest;
  mixedSignals: MixedSignalHit[];
  breadcrumbing: boolean;
  evidence: EvidenceMsg[];
  preview: Preview;
  enoughForTurningPoints: boolean;
  /** 较新的分析才有；旧报告没有。 */
  recurring?: RecurringLine[];
  /** 较新的分析才有：证据消息各自重复了几次、几周。 */
  repeats?: RepeatInfo[];
  /** 双方最后一条消息（任意类型）。 */
  last?: { Y?: { id: number; ts: number }; H?: { id: number; ts: number } };
}
