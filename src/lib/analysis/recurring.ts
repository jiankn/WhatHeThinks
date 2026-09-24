/**
 * 几乎逐字重复的消息：同一人、同样的话，出现在至少 3 个不同的周。
 * 用于报告里的“固定套路”观察（例如每周同一天同一句问候）。只看文字消息。
 */

import type { RecurringLine } from "./analysis-types";
import type { RoleMsg } from "./sessions";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_WEEKS = 3;
const MIN_CHARS = 10;
const MAX_LINES = 12;

function norm(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export function findRecurring(msgs: RoleMsg[]): RecurringLine[] {
  if (!msgs.length) return [];
  const start = msgs[0].ts;
  const groups = new Map<string, { sender: RoleMsg["sender"]; weeks: Set<number>; ids: number[] }>();
  for (const m of msgs) {
    if (m.type !== "text") continue;
    const key = norm(m.text);
    if (key.length < MIN_CHARS) continue;
    const g = groups.get(`${m.sender}:${key}`) ?? { sender: m.sender, weeks: new Set<number>(), ids: [] };
    g.weeks.add(Math.floor((m.ts - start) / WEEK_MS));
    g.ids.push(m.id);
    groups.set(`${m.sender}:${key}`, g);
  }
  return [...groups.values()]
    .filter(g => g.weeks.size >= MIN_WEEKS)
    // 他的话优先，其次按出现周数
    .sort((a, b) => Number(b.sender === "H") - Number(a.sender === "H") || b.weeks.size - a.weeks.size || a.ids[0] - b.ids[0])
    .slice(0, MAX_LINES)
    .map(g => ({ sender: g.sender, count: g.ids.length, weeks: g.weeks.size, ids: [g.ids[0], ...g.ids.slice(-2)].filter((id, i, a) => a.indexOf(id) === i) }));
}
