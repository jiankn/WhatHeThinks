/**
 * 基于周桶的时间窗聚合。报告里"最近 N 周"的数字都从这里来，
 * 与引擎的周桶口径一致（不回看原始消息，服务器也没有原始消息）。
 */

import type { SlimPersonMetrics, SlimWeek } from "./payload";

export interface PersonSums {
  initiations: number;
  msgCount: number;
  textCount: number;
  questions: number;
  plansConcrete: number;
  plansVague: number;
  plansCancel: number;
  affection: number;
  busyExcuse: number;
  apology: number;
  support: number;
  /** 各周 replyP50 的均值（分钟），无回复样本的周不计。 */
  replyP50: number;
  /** 按文本条数加权的平均长度。 */
  avgLen: number;
}

export interface WindowAgg {
  weeks: number;
  Y: PersonSums;
  H: PersonSums;
  /** H 的发起占比（0–1），无会话时为 null。 */
  hInitShare: number | null;
  hQuestionRatio: number;
  yQuestionRatio: number;
}

function sum(list: SlimPersonMetrics[]): PersonSums {
  const s = (f: (m: SlimPersonMetrics) => number) => list.reduce((a, m) => a + f(m), 0);
  const textCount = s((m) => m.textCount);
  const replies = list.filter((m) => m.replyP50 > 0);
  return {
    initiations: s((m) => m.initiations),
    msgCount: s((m) => m.msgCount),
    textCount,
    questions: s((m) => m.questions),
    plansConcrete: s((m) => m.plansConcrete),
    plansVague: s((m) => m.plansVague),
    plansCancel: s((m) => m.plansCancel),
    affection: s((m) => m.affection),
    busyExcuse: s((m) => m.busyExcuse),
    apology: s((m) => m.apology),
    support: s((m) => m.support),
    replyP50: replies.length ? replies.reduce((a, m) => a + m.replyP50, 0) / replies.length : 0,
    avgLen: textCount ? s((m) => m.avgLen * m.textCount) / textCount : 0,
  };
}

function finish(weeks: SlimWeek[]): WindowAgg {
  const Y = sum(weeks.map((w) => w.Y));
  const H = sum(weeks.map((w) => w.H));
  const inits = Y.initiations + H.initiations;
  return {
    weeks: weeks.length,
    Y,
    H,
    hInitShare: inits ? H.initiations / inits : null,
    hQuestionRatio: H.textCount ? H.questions / H.textCount : 0,
    yQuestionRatio: Y.textCount ? Y.questions / Y.textCount : 0,
  };
}

/** 最近 n 个非稀疏周（与 interest.ts 的"近期"口径一致）。 */
export function lastValidWeeks(weeks: SlimWeek[], n: number): WindowAgg {
  const valid = weeks.filter((w) => !w.sparse);
  return finish((valid.length ? valid : weeks).slice(-n));
}
