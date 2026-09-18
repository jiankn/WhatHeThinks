/**
 * §5 周分桶与 H 的每周指标向量 / Engagement Index。
 */

import type { Role, WeekBucket } from "./analysis-types";
import type { RoleMsg } from "./sessions";
import { aggregate, type Events } from "./metrics";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 某 ts 所在 ISO 周（周一 00:00 UTC）的起点。 */
export function weekStartOf(ts: number): number {
  const dayFloor = Math.floor(ts / DAY_MS) * DAY_MS;
  const dow = new Date(dayFloor).getUTCDay(); // 0=Sun
  const offset = (dow + 6) % 7; // 距本周一的天数
  return dayFloor - offset * DAY_MS;
}

export function buildWeeks(
  msgs: RoleMsg[],
  ev: Events,
  range: [number, number],
): WeekBucket[] {
  const weeks: WeekBucket[] = [];
  if (msgs.length === 0) return weeks;
  const first = weekStartOf(range[0]);
  const last = weekStartOf(range[1]);
  for (let w = first; w <= last; w += WEEK_MS) {
    const agg = aggregate(msgs, ev, w, w + WEEK_MS);
    const total = agg.Y.msgCount + agg.H.msgCount;
    weeks.push({
      weekStart: w,
      total,
      sparse: total < 10,
      Y: agg.Y,
      H: agg.H,
    });
  }
  return weeks;
}

/** §5.1 H 的每周指标向量。sparse 周返回 null。 */
export interface WeekVector {
  weekStart: number;
  initShare: number;
  replyP50Log: number;
  questionRatio: number;
  msgShare: number;
  avgLen: number;
  plansPerWeek: number;
  warmthRate: number;
  dryRate: number;
}

export function weekVector(wb: WeekBucket): WeekVector | null {
  if (wb.sparse) return null;
  const H = wb.H;
  const inits = H.initiations + wb.Y.initiations;
  const msgs = H.msgCount + wb.Y.msgCount;
  return {
    weekStart: wb.weekStart,
    initShare: inits ? H.initiations / inits : 0,
    replyP50Log: Math.log1p(H.replyP50),
    questionRatio: H.questionRatio,
    msgShare: msgs ? H.msgCount / msgs : 0,
    avgLen: H.avgLen,
    plansPerWeek: H.plansConcrete,
    warmthRate: H.textCount ? H.affection / H.textCount : 0,
    dryRate: H.textCount ? H.dry / H.textCount : 0,
  };
}

/** 指标权重与方向（+ 表示越大越投入）。§5.2 / §6 共用。 */
export const WEIGHTS: {
  key: keyof Omit<WeekVector, "weekStart">;
  w: number;
  dir: 1 | -1;
}[] = [
  { key: "initShare", w: 0.25, dir: 1 },
  { key: "replyP50Log", w: 0.2, dir: -1 },
  { key: "questionRatio", w: 0.15, dir: 1 },
  { key: "msgShare", w: 0.15, dir: 1 },
  { key: "plansPerWeek", w: 0.1, dir: 1 },
  { key: "warmthRate", w: 0.1, dir: 1 },
  { key: "dryRate", w: 0.05, dir: -1 },
];

/** driver 展示用的人类可读指标名（§6 输出）。 */
export const DRIVER_LABEL: Record<string, string> = {
  initShare: "conversation initiation",
  replyP50Log: "reply speed",
  questionRatio: "questions he asks",
  msgShare: "share of the conversation",
  plansPerWeek: "concrete plans",
  warmthRate: "warmth",
  dryRate: "dry replies",
};
