/**
 * §8 Mixed Signals 规则。基于最近 8 周，每条命中带证据。
 */

import type {
  MixedSignalHit,
  PersonMetrics,
  Session,
} from "./analysis-types";
import type { RoleMsg } from "./sessions";
import { aggregate, type Events } from "./metrics";
import { followThrough } from "./interest";

const DAY_MS = 24 * 60 * 60 * 1000;

function warmthRate(m: PersonMetrics): number {
  return m.textCount ? m.affection / m.textCount : 0;
}
function initShare(H: PersonMetrics, Y: PersonMetrics): number {
  const t = H.initiations + Y.initiations;
  return t ? H.initiations / t : 0;
}
function take<T>(arr: T[] | undefined, n: number): T[] {
  return (arr ?? []).slice(0, n);
}

export function computeMixedSignals(
  msgs: RoleMsg[],
  ev: Events,
  sessions: Session[],
  range: [number, number],
): { hits: MixedSignalHit[]; breadcrumbing: boolean } {
  const from = range[1] - 56 * DAY_MS;
  const to = range[1] + 1;
  const agg = aggregate(msgs, ev, from, to);
  const H = agg.H;
  const Y = agg.Y;
  const hits: MixedSignalHit[] = [];

  const push = (
    id: string,
    side: MixedSignalHit["side"],
    evidenceIds: number[],
  ) => hits.push({ id, side, evidenceIds });

  // flirt_no_plans：高温度但无计划
  if (warmthRate(H) >= warmthRate(Y) * 0.8 && H.plansConcrete <= 1 && H.affection > 0) {
    push("flirt_no_plans", "distance", take(H.hits["affection"], 4));
  }

  // replies_never_initiates：秒回但从不发起
  if (H.replyP50 > 0 && H.replyP50 <= 30 && initShare(H, Y) <= 0.25) {
    push("replies_never_initiates", "distance", []);
  }

  // disappear_return：消失后又猛回
  const inWindow = sessions.filter(
    (s) => s.startTs >= from && s.startTs < to,
  );
  const lens = sessions.map((s) => s.endIdx - s.startIdx + 1).sort((a, b) => a - b);
  const median = lens.length ? lens[Math.floor(lens.length / 2)] : 0;
  let disappearReturn = 0;
  const drEvidence: number[] = [];
  for (let i = 0; i < inWindow.length; i++) {
    const s = inWindow[i];
    if (s.initiator !== "H") continue;
    const len = s.endIdx - s.startIdx + 1;
    // 距上一会话是否 ≥72h：用 isReengage(48h) 收紧到 72h
    const prevEnd = i > 0 ? inWindow[i - 1].endTs : -Infinity;
    if (s.startTs - prevEnd >= 72 * 60 * 60 * 1000 && len >= 1.5 * median) {
      disappearReturn++;
      drEvidence.push(msgs[s.startIdx].id);
    }
  }
  if (disappearReturn >= 2) push("disappear_return", "distance", drEvidence.slice(0, 4));

  // words_vs_followthrough：暖话不兑现
  const follow = followThrough(msgs, H);
  if (H.affection >= 3 && follow !== null && follow <= 0.4) {
    push("words_vs_followthrough", "distance", [
      ...take(H.hits["affection"], 2),
      ...take(H.hits["planCancel"], 2),
    ]);
  }

  // vague_plans：只有模糊计划
  if (H.plansVague >= 3 && H.plansConcrete === 0) {
    push("vague_plans", "distance", take(H.hits["planVague"], 4));
  }

  // late_night_only：主要深夜活跃
  const hInits = ev.inits.filter(
    (e) => e.role === "H" && e.ts >= from && e.ts < to,
  );
  if (hInits.length >= 4) {
    const late = hInits.filter((e) => {
      const h = new Date(e.ts).getUTCHours();
      return h >= 22 || h <= 3;
    }).length;
    if (late / hInits.length >= 0.5) push("late_night_only", "distance", []);
  }

  // busy_pattern：反复"忙"且发起下降
  if (H.busyExcuse >= 4) {
    const prevFrom = from - 56 * DAY_MS;
    const prev = aggregate(msgs, ev, prevFrom, from).H;
    const prevY = aggregate(msgs, ev, prevFrom, from).Y;
    if (initShare(H, Y) < initShare(prev, prevY)) {
      push("busy_pattern", "distance", take(H.hits["busyExcuse"], 4));
    }
  }

  // 也补一些"兴趣"侧证据（用于两栏展示）
  if (H.affection >= 3) push("warm_words", "interest", take(H.hits["affection"], 3));
  if (H.plansConcrete >= 2)
    push("makes_plans", "interest", take(H.hits["planConcrete"], 3));
  if (initShare(H, Y) >= 0.45)
    push("initiates", "interest", []);

  const distanceIds = new Set(hits.filter((h) => h.side === "distance").map((h) => h.id));
  const breadcrumbing =
    distanceIds.has("disappear_return") &&
    (distanceIds.has("vague_plans") || distanceIds.has("flirt_no_plans"));

  return { hits, breadcrumbing };
}
