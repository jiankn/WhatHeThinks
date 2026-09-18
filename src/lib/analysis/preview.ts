/**
 * §10 预览数据。直接由引擎生成，非 AI 输出。
 */

import type {
  Analysis,
  Preview,
  TurningPoint,
} from "./analysis-types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 选出预览用的头条转折点：优先近期的 high/medium cooling，shift 最负。 */
export function pickHeadline(tps: TurningPoint[]): TurningPoint | null {
  const strong = tps.filter((t) => t.confidence !== "low");
  if (strong.length === 0) return null;
  const cooling = strong.filter((t) => t.direction === "cooling");
  const pool = cooling.length ? cooling : strong;
  return pool.reduce((best, t) =>
    Math.abs(t.shift) > Math.abs(best.shift) ? t : best,
  );
}

function headlineMetric(
  driverMetric: string,
): "initiation" | "reply" | "volume" {
  if (driverMetric === "initShare") return "initiation";
  if (driverMetric === "replyP50Log") return "reply";
  return "volume";
}

function headlineSentence(
  metric: "initiation" | "reply" | "volume",
  direction: "cooling" | "warming",
  dateStr: string,
): string {
  if (direction === "warming")
    return `His effort noticeably increased around ${dateStr}.`;
  switch (metric) {
    case "initiation":
      return `His conversation initiation began dropping around ${dateStr}.`;
    case "reply":
      return `His replies started getting noticeably slower around ${dateStr}.`;
    case "volume":
      return `His share of the conversation started shrinking around ${dateStr}.`;
  }
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildPreview(
  a: Omit<Analysis, "preview">,
  liteMode: boolean,
): Preview {
  const tp = pickHeadline(a.turningPoints);
  const totalInit = a.totals.Y.initiations + a.totals.H.initiations;
  const totalMsgs = a.totals.Y.msgCount + a.totals.H.msgCount;

  let headline: Preview["headline"] = null;
  if (tp) {
    const metric = headlineMetric(tp.drivers[0]?.metric ?? "msgShare");
    headline = {
      date: tp.date,
      metric,
      sentence: headlineSentence(metric, tp.direction, fmtDate(tp.date)),
    };
  }

  return {
    totalMessages: totalMsgs,
    activeDays: a.activeDays,
    range: a.range,
    initiation: {
      you: totalInit ? a.totals.Y.initiations / totalInit : 0,
      him: totalInit ? a.totals.H.initiations / totalInit : 0,
    },
    medianReply: { you: a.totals.Y.replyP50, him: a.totals.H.replyP50 },
    messageShare: {
      you: totalMsgs ? a.totals.Y.msgCount / totalMsgs : 0,
      him: totalMsgs ? a.totals.H.msgCount / totalMsgs : 0,
    },
    questionRatio: { you: a.totals.Y.questionRatio, him: a.totals.H.questionRatio },
    headline,
    counts: {
      turningPoints: a.turningPoints.length,
      mixedSignals: a.mixedSignals.filter((m) => m.side === "distance").length,
      evidence: a.evidence.length,
      shifts: a.turningPoints.filter((t) => t.confidence !== "low").length,
    },
    liteMode,
  };
}
