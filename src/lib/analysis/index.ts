/**
 * 分析引擎入口。把解析结果串联为完整 Analysis。
 * 详见 docs/signal-scoring-spec.md。
 */

import { CONFIG } from "./config";
import type { Analysis } from "./analysis-types";
import type { Msg } from "./types";
import type { ParseResult } from "./types";
import { buildSessions, type RoleMsg } from "./sessions";
import { computeEvents, aggregate } from "./metrics";
import { buildWeeks } from "./weekly";
import { findTurningPoints } from "./turningPoints";
import { computeInterest } from "./interest";
import { computeMixedSignals } from "./mixedSignals";
import { selectEvidence } from "./evidence";
import { buildPreview } from "./preview";

export * from "./analysis-types";
export { parseWhatsApp, parsePlainLines, parseAny } from "./parser";
export { extractChatText } from "./zip";

/** 把原始消息映射为角色消息，只保留 you/him 两人，按 ts 升序。 */
export function mapRoles(
  messages: Msg[],
  youName: string,
  himName: string,
): RoleMsg[] {
  return messages
    .filter((m) => m.sender === youName || m.sender === himName)
    .map((m) => ({ ...m, sender: m.sender === youName ? "Y" : "H" }) as RoleMsg)
    .sort((a, b) => a.ts - b.ts);
}

function distinctDays(msgs: RoleMsg[]): number {
  const s = new Set<string>();
  for (const m of msgs) s.add(new Date(m.ts).toISOString().slice(0, 10));
  return s.size;
}

/** 分析已映射角色的消息。合成数据可直接调用此函数。 */
export function analyzeRoleMsgs(
  msgs: RoleMsg[],
  liteMode = false,
): Analysis {
  if (msgs.length === 0) throw new Error("没有可分析的消息");
  const range: [number, number] = [msgs[0].ts, msgs[msgs.length - 1].ts];
  const sessions = buildSessions(msgs);
  const ev = computeEvents(msgs, sessions);
  const totalsAgg = aggregate(msgs, ev, range[0], range[1] + 1);
  const totals = { Y: totalsAgg.Y, H: totalsAgg.H };
  const activeDays = distinctDays(msgs);

  const days = (range[1] - range[0]) / (24 * 60 * 60 * 1000);
  const enoughForTurningPoints =
    !liteMode &&
    msgs.length >= CONFIG.MIN_MESSAGES_FOR_TURNING_POINTS &&
    days >= CONFIG.MIN_DAYS_FOR_TURNING_POINTS;

  const weeks = liteMode ? [] : buildWeeks(msgs, ev, range);
  const turningPoints = enoughForTurningPoints
    ? findTurningPoints(weeks, msgs)
    : [];
  const interest = computeInterest(weeks, totals.H, msgs, turningPoints, range);
  const { hits: mixedSignals, breadcrumbing } = liteMode
    ? { hits: [], breadcrumbing: false }
    : computeMixedSignals(msgs, ev, sessions, range);
  const evidence = selectEvidence(msgs, turningPoints, mixedSignals);

  const partial: Omit<Analysis, "preview"> = {
    totals,
    totalSessions: sessions.length,
    range,
    activeDays,
    weeks,
    turningPoints,
    interest,
    mixedSignals,
    breadcrumbing,
    evidence,
    enoughForTurningPoints,
  };
  return { ...partial, preview: buildPreview(partial, liteMode) };
}

/** 从解析结果分析。youName/himName 为参与者显示名。 */
export function analyze(
  parse: ParseResult,
  youName: string,
  himName: string,
): Analysis {
  const msgs = mapRoles(parse.messages, youName, himName);
  if (msgs.length < CONFIG.MIN_MESSAGES) {
    throw new Error(
      `消息过少（${msgs.length} 条），至少需要 ${CONFIG.MIN_MESSAGES} 条`,
    );
  }
  return analyzeRoleMsgs(msgs, !parse.hadTimestamps);
}
