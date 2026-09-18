/**
 * §6 转折点引擎。用前后窗口的 Cohen's d 加权打分，二分选点。
 */

import type {
  MetricSnapshot,
  TurningPoint,
  WeekBucket,
} from "./analysis-types";
import type { RoleMsg } from "./sessions";
import { LEX } from "./lexicons";
import {
  WEIGHTS,
  weekVector,
  type WeekVector,
} from "./weekly";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SIDE = 3; // 前后各至少 3 个有效周
const WINDOW = 4; // 窗口最多 4 周
const THRESHOLD = 0.8;
const MAX_POINTS = 5;

type MetricKey = (typeof WEIGHTS)[number]["key"];

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function variance(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
}

/** 每指标的 floor（避免除以 ~0）：全程该指标均值的 0.1，下限 1e-6。 */
function computeFloors(vecs: WeekVector[]): Record<MetricKey, number> {
  const floors = {} as Record<MetricKey, number>;
  for (const { key } of WEIGHTS) {
    const vals = vecs.map((v) => v[key]);
    floors[key] = Math.max(0.1 * Math.abs(mean(vals)), 1e-6);
  }
  return floors;
}

function cohenD(A: number[], B: number[], floor: number): number {
  const mA = mean(A);
  const mB = mean(B);
  const pooled = Math.sqrt((variance(A, mA) + variance(B, mB)) / 2);
  return (mB - mA) / Math.max(pooled, floor);
}

interface Scored {
  i: number; // vecs 下标（转折发生在 vecs[i] 周）
  shift: number;
  ds: Record<MetricKey, number>;
}

function scoreAt(
  vecs: WeekVector[],
  i: number,
  lo: number,
  hi: number,
  floors: Record<MetricKey, number>,
): Scored | null {
  const before = vecs.slice(Math.max(lo, i - WINDOW), i);
  const after = vecs.slice(i, Math.min(hi, i + WINDOW));
  if (before.length < MIN_SIDE || after.length < MIN_SIDE) return null;
  let shift = 0;
  const ds = {} as Record<MetricKey, number>;
  for (const { key, w, dir } of WEIGHTS) {
    const d = cohenD(
      before.map((v) => v[key]),
      after.map((v) => v[key]),
      floors[key],
    );
    ds[key] = d;
    shift += w * dir * d;
  }
  return { i, shift, ds };
}

/** 在 [lo,hi) 段内二分递归选点。 */
function segment(
  vecs: WeekVector[],
  lo: number,
  hi: number,
  floors: Record<MetricKey, number>,
  out: Scored[],
): void {
  if (hi - lo < MIN_SIDE * 2) return;
  let best: Scored | null = null;
  for (let i = lo + MIN_SIDE; i <= hi - MIN_SIDE; i++) {
    const s = scoreAt(vecs, i, lo, hi, floors);
    if (s && (!best || Math.abs(s.shift) > Math.abs(best.shift))) best = s;
  }
  if (!best || Math.abs(best.shift) < THRESHOLD) return;
  out.push(best);
  segment(vecs, lo, best.i, floors, out);
  segment(vecs, best.i, hi, floors, out);
}

function snapshot(win: WeekVector[], buckets: Map<number, WeekBucket>): MetricSnapshot {
  const avg = (key: MetricKey) => mean(win.map((v) => v[key]));
  return {
    initShare: avg("initShare"),
    replyP50: mean(
      win.map((v) => buckets.get(v.weekStart)!.H.replyP50),
    ),
    questionRatio: avg("questionRatio"),
    msgShare: avg("msgShare"),
    avgLen: avg("avgLen"),
    plansPerWeek: avg("plansPerWeek"),
    warmthRate: avg("warmthRate"),
    dryRate: avg("dryRate"),
  };
}

/** ±7 天内找 H 消息量前后 7 天差异最大的一天作为精确日期。 */
function refineDate(msgs: RoleMsg[], centerTs: number): number {
  let bestDay = centerTs;
  let bestDelta = -1;
  for (let off = -7; off <= 7; off++) {
    const c = centerTs + off * DAY_MS;
    let before = 0;
    let after = 0;
    for (const m of msgs) {
      if (m.sender !== "H") continue;
      if (m.ts >= c - 7 * DAY_MS && m.ts < c) before++;
      else if (m.ts >= c && m.ts < c + 7 * DAY_MS) after++;
    }
    const delta = Math.abs(after - before);
    if (delta > bestDelta) {
      bestDelta = delta;
      bestDay = c;
    }
  }
  return bestDay;
}

function windowMsgCount(
  msgs: RoleMsg[],
  from: number,
  to: number,
): number {
  let n = 0;
  for (const m of msgs) if (m.ts >= from && m.ts < to) n++;
  return n;
}

function collectEvidence(
  win: WeekVector[],
  buckets: Map<number, WeekBucket>,
  limit: number,
): number[] {
  const ids: number[] = [];
  const keys = ["conflict", "dry", "planConcrete", "planVague", "planCancel", "affection"];
  for (const v of win) {
    const H = buckets.get(v.weekStart)!.H;
    for (const k of keys) for (const id of H.hits[k] ?? []) ids.push(id);
  }
  return [...new Set(ids)].slice(0, limit);
}

export function findTurningPoints(
  weeks: WeekBucket[],
  msgs: RoleMsg[],
): TurningPoint[] {
  const buckets = new Map(weeks.map((w) => [w.weekStart, w]));
  const vecs = weeks
    .map(weekVector)
    .filter((v): v is WeekVector => v !== null);
  if (vecs.length < MIN_SIDE * 2) return [];

  const floors = computeFloors(vecs);
  const scored: Scored[] = [];
  segment(vecs, 0, vecs.length, floors, scored);

  // 最多 5 个，按 |shift| 取最强。
  scored.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
  const top = scored.slice(0, MAX_POINTS);

  return top.map((s): TurningPoint => {
    const before = vecs.slice(Math.max(0, s.i - WINDOW), s.i);
    const after = vecs.slice(s.i, Math.min(vecs.length, s.i + WINDOW));
    const direction = s.shift < 0 ? "cooling" : "warming";

    const drivers = WEIGHTS.map(({ key }) => ({
      metric: key as string,
      before: snapshotVal(before, key, buckets),
      after: snapshotVal(after, key, buckets),
      d: s.ds[key],
    }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 3);

    const sameDir = WEIGHTS.filter(
      ({ key, dir }) =>
        Math.abs(s.ds[key]) >= 0.8 && Math.sign(dir * s.ds[key]) === Math.sign(s.shift),
    ).length;

    const winFrom = before[0].weekStart;
    const winTo = after[after.length - 1].weekStart + 7 * DAY_MS;
    const winMsgs = windowMsgCount(msgs, winFrom, winTo);

    let confidence: TurningPoint["confidence"] = "low";
    if (Math.abs(s.shift) >= 1.5 && sameDir >= 3 && winMsgs >= 150)
      confidence = "high";
    else if (Math.abs(s.shift) >= 1.0 && sameDir >= 2) confidence = "medium";

    const date = refineDate(msgs, vecs[s.i].weekStart);
    const conflict = conflictAround(msgs, date);

    return {
      id: `tp_${s.i}`,
      date,
      direction,
      confidence,
      shift: s.shift,
      before: snapshot(before, buckets),
      after: snapshot(after, buckets),
      drivers,
      evidenceIds: collectEvidence([...before, ...after], buckets, 12),
      context: {
        yInitShareBefore: mean(
          before.map((v) => yInitShare(buckets.get(v.weekStart)!)),
        ),
        yInitShareAfter: mean(
          after.map((v) => yInitShare(buckets.get(v.weekStart)!)),
        ),
      },
      conflictDate: conflict?.date,
      shiftBeforeConflict: conflict ? date < conflict.date : undefined,
    };
  });
}

/** §6：转折点 ±21 天内若 conflict 命中 ≥3，返回最早命中日。 */
function conflictAround(
  msgs: RoleMsg[],
  date: number,
): { date: number } | null {
  const hits: number[] = [];
  for (const m of msgs) {
    if (m.type !== "text") continue;
    if (Math.abs(m.ts - date) > 21 * DAY_MS) continue;
    if (LEX.conflict.test(m.text)) hits.push(m.ts);
  }
  if (hits.length < 3) return null;
  return { date: Math.min(...hits) };
}

function yInitShare(wb: WeekBucket): number {
  const t = wb.Y.initiations + wb.H.initiations;
  return t ? wb.Y.initiations / t : 0;
}

function snapshotVal(
  win: WeekVector[],
  key: MetricKey,
  buckets: Map<number, WeekBucket>,
): number {
  if (key === "replyP50Log")
    return mean(win.map((v) => buckets.get(v.weekStart)!.H.replyP50));
  return mean(win.map((v) => v[key]));
}
