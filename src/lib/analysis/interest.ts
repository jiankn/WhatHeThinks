/**
 * §7 Interest Level。基于 H 最近 6 个有效周（不足则用全部）。
 * 只输出等级 + 子维度，绝不输出百分比 love score。
 */

import type {
  Interest,
  InterestDimension,
  InterestLevel,
  PersonMetrics,
  TurningPoint,
  WeekBucket,
} from "./analysis-types";
import type { RoleMsg } from "./sessions";

const DAY_MS = 24 * 60 * 60 * 1000;

function sigmoid(x: number, mid: number, k: number): number {
  return 1 / (1 + Math.exp(-(x - mid) / k));
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function label(score: number | null): InterestDimension["label"] {
  if (score === null) return "insufficient";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "moderate";
  return "low";
}

/** §7 Follow-through：H 的 concrete plan 后 7 天内未被 cancel 的比例。 */
export function followThrough(
  msgs: RoleMsg[],
  totalsH: PersonMetrics,
): number | null {
  const planIds = totalsH.hits["planConcrete"] ?? [];
  if (planIds.length < 2) return null;
  const byId = new Map(msgs.map((m) => [m.id, m]));
  const cancelTs = (totalsH.hits["planCancel"] ?? [])
    .map((id) => byId.get(id)?.ts)
    .filter((t): t is number => t !== undefined);
  let kept = 0;
  for (const id of planIds) {
    const ts = byId.get(id)?.ts;
    if (ts === undefined) continue;
    const cancelled = cancelTs.some((c) => c >= ts && c <= ts + 7 * DAY_MS);
    if (!cancelled) kept++;
  }
  return kept / planIds.length;
}

export function computeInterest(
  weeks: WeekBucket[],
  totalsH: PersonMetrics,
  msgs: RoleMsg[],
  turningPoints: TurningPoint[],
  range: [number, number],
): Interest {
  const valid = weeks.filter((w) => !w.sparse);
  const recent = valid.slice(-6);
  const base = recent.length ? recent : valid;

  const avgH = (f: (m: PersonMetrics) => number) => mean(base.map((w) => f(w.H)));
  const avgY = (f: (m: PersonMetrics) => number) => mean(base.map((w) => f(w.Y)));

  const initShare =
    avgH((m) => m.initiations) + avgY((m) => m.initiations) > 0
      ? avgH((m) => m.initiations) /
        (avgH((m) => m.initiations) + avgY((m) => m.initiations))
      : 0;

  const initiative = sigmoid(initShare, 0.4, 0.12);
  const curiosity = sigmoid(avgH((m) => m.questionRatio), 0.1, 0.05);

  const hp50 = avgH((m) => m.replyP50);
  const yp50 = avgY((m) => m.replyP50);
  const replyScore = hp50 + yp50 > 0 ? sigmoid(yp50 / (hp50 + yp50), 0.5, 0.15) : 0.5;
  const hLen = avgH((m) => m.avgLen);
  const yLen = avgY((m) => m.avgLen);
  const lenScore = hLen + yLen > 0 ? sigmoid(hLen / (hLen + yLen), 0.45, 0.12) : 0.5;
  const msgShare =
    avgH((m) => m.msgCount) + avgY((m) => m.msgCount) > 0
      ? avgH((m) => m.msgCount) /
        (avgH((m) => m.msgCount) + avgY((m) => m.msgCount))
      : 0.5;
  const engagement = clamp01(
    mean([replyScore, lenScore, sigmoid(msgShare, 0.4, 0.1)]),
  );

  const planning = sigmoid(avgH((m) => m.plansConcrete), 0.5, 0.4);
  const follow = followThrough(msgs, totalsH);

  const dims: InterestDimension[] = [
    { key: "initiative", score: initiative, label: label(initiative) },
    { key: "curiosity", score: curiosity, label: label(curiosity) },
    { key: "engagement", score: engagement, label: label(engagement) },
    { key: "planning", score: planning, label: label(planning) },
    { key: "followThrough", score: follow, label: label(follow) },
  ];

  const validScores = dims
    .map((d) => d.score)
    .filter((s): s is number => s !== null);
  const S = mean(validScores);
  const spread = validScores.length
    ? Math.max(...validScores) - Math.min(...validScores)
    : 0;

  let level: InterestLevel;
  if (S >= 0.7) level = "strong";
  else if (S >= 0.35 && spread >= 0.45) level = "mixed";
  else if (S >= 0.45) level = "moderate";
  else level = "low";

  // 最近 8 周内是否有 cooling 转折点
  const cutoff = range[1] - 8 * 7 * DAY_MS;
  const trendDeclining = turningPoints.some(
    (t) => t.direction === "cooling" && t.date >= cutoff && t.confidence !== "low",
  );

  return { level, score: S, dimensions: dims, trendDeclining };
}
