/**
 * 分析完成后、打开报告前的"聊天回顾"幻灯片（日历、谁说得多、节奏、最长的消息、第一段和最近一段对话、常用词）。
 * 全部在浏览器的 Worker 里从原始消息算出，只在本地展示，不上传。时间戳按 UTC 处理（导出无时区）。
 */

import { buildSessions, type RoleMsg } from "./sessions";
import type { Role } from "./analysis-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** 日历从第一条消息那年的一月开始，最多显示最近这么多个月。 */
const CALENDAR_MONTHS = 12;
const SNIPPET = 5;
const TEXT_MAX = 400;

export interface WrappedMonth { year: number; month: number; label: string; days: number[] }
export interface WrappedLine { mine: boolean; text: string }
export interface WrappedMessage { words: number; ts: number; text: string }

export interface Wrapped {
  liteMode: boolean;
  counts: Record<Role, number>;
  /** 开启对话的占比（不含夜间空档切出的会话）。 */
  starts: Record<Role, number> | null;
  /** 最近最多 12 个月，每月每天的消息数。 */
  calendar: WrappedMonth[];
  calendarMax: number;
  replyMin: Record<Role, number | null> | null;
  recordDay: { count: number; ts: number } | null;
  streakDays: number;
  longestSilenceDays: number;
  hours: number[];
  /** 晚上 10 点到凌晨 4 点之间的消息占比。 */
  lateShare: number;
  peakHour: number;
  longest: Partial<Record<Role, WrappedMessage>>;
  first: { ts: number; lines: WrappedLine[] } | null;
  last: { ts: number; lines: WrappedLine[] } | null;
  words: Record<Role, string[]>;
  emojis: Record<Role, string[]>;
}

const STOP = new Set(`a about above after again against all almost also am an and any are aren as at be because been before being
below between both but by can cant could couldnt did didnt do does doesnt doing dont down during each even ever every few for from
further get gets getting go going gone got gotta had hadnt has hasnt have havent having he hed hell hes her here heres hers herself him
himself his how hows i id ill im ive if in into is isnt it its itself just lets like me more most much must my myself no nor not now of
off on once only or other ought our ours ourselves out over own really same she shed shell shes should shouldnt so some still such
than that thats the their theirs them themselves then there theres these they theyd theyll theyre theyve this those through to too
under until up us very was wasnt we wed well were weve werent what whats when whens where wheres which while who whos whom why whys
will with wont would wouldnt you youd youll youre youve your yours yourself yourselves yes yeah yep yup no nope ok okay oh ohh ah
lol lmao haha hahaha hehe hmm hm um uh omg u ur r ya yea gonna wanna one two also back today tomorrow tonight's let know think
thing things time day sure want maybe though thats yet ill see yes got would could good great nice cool right well much sounds sound
media omitted message deleted edited null`.split(/\s+/));

const EMOJI_RE = /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️|‍\p{Extended_Pictographic}️?)*/gu;

const dayIndex = (ts: number) => Math.floor(ts / DAY_MS);
const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const clip = (t: string) => (t.length > TEXT_MAX ? `${t.slice(0, TEXT_MAX - 1)}…` : t);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function top<T>(counts: Map<T, number>, n: number): T[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function lines(msgs: RoleMsg[]): WrappedLine[] {
  return msgs.map(m => ({ mine: m.sender === "Y", text: clip(m.text) }));
}

/** names：两人的显示名（小写后排除，避免"常用词"变成对方的名字）。 */
export function buildWrapped(msgs: RoleMsg[], liteMode: boolean, names: string[] = []): Wrapped {
  const counts: Record<Role, number> = { Y: 0, H: 0 };
  const texts = msgs.filter(m => m.type === "text" && m.text.trim());
  for (const m of msgs) counts[m.sender]++;

  // ── 常用词与表情 ──
  const nameWords = new Set(names.flatMap(n => n.toLowerCase().split(/\s+/)));
  const wordMaps: Record<Role, Map<string, number>> = { Y: new Map(), H: new Map() };
  const emojiMaps: Record<Role, Map<string, number>> = { Y: new Map(), H: new Map() };
  for (const m of texts) {
    for (const e of m.text.match(EMOJI_RE) ?? []) emojiMaps[m.sender].set(e, (emojiMaps[m.sender].get(e) ?? 0) + 1);
    for (const raw of m.text.toLowerCase().replace(/[’']/g, "").match(/\p{L}+/gu) ?? []) {
      if (raw.length < 3 || STOP.has(raw) || nameWords.has(raw)) continue;
      wordMaps[m.sender].set(raw, (wordMaps[m.sender].get(raw) ?? 0) + 1);
    }
  }

  // ── 最长的一条 ──
  const longest: Wrapped["longest"] = {};
  for (const m of texts) {
    const w = wordCount(m.text);
    const cur = longest[m.sender];
    if (!cur || w > cur.words) longest[m.sender] = { words: w, ts: m.ts, text: clip(m.text) };
  }

  // ── 第一段与最近一段对话 ──
  const sessions = buildSessions(msgs);
  const sessionText = (s: (typeof sessions)[number]) => msgs.slice(s.startIdx, s.endIdx + 1).filter(m => m.type === "text" && m.text.trim());
  const firstSession = sessions.find(s => sessionText(s).length > 0);
  const lastSession = [...sessions].reverse().find(s => sessionText(s).length > 0);
  const firstMsgs = firstSession ? sessionText(firstSession).slice(0, SNIPPET) : [];
  const lastMsgs = lastSession ? sessionText(lastSession).slice(-SNIPPET) : [];
  const first = firstMsgs.length ? { ts: firstMsgs[0].ts, lines: lines(firstMsgs) } : null;
  const last = lastMsgs.length && lastSession !== firstSession ? { ts: lastMsgs[0].ts, lines: lines(lastMsgs) } : null;

  const base = {
    liteMode, counts, longest, first, last,
    words: { Y: top(wordMaps.Y, 3), H: top(wordMaps.H, 3) },
    emojis: { Y: top(emojiMaps.Y, 3), H: top(emojiMaps.H, 3) },
  };
  if (liteMode || !msgs.length) {
    return { ...base, starts: null, calendar: [], calendarMax: 0, replyMin: null, recordDay: null, streakDays: 0, longestSilenceDays: 0, hours: [], lateShare: 0, peakHour: 0 };
  }

  // ── 谁先开口 ──
  const opened: Record<Role, number> = { Y: 0, H: 0 };
  for (const s of sessions) if (!s.isOvernight) opened[s.initiator]++;
  const openedTotal = opened.Y + opened.H;
  const starts = openedTotal ? { Y: opened.Y / openedTotal, H: opened.H / openedTotal } : null;

  // ── 回复时间中位数（对方消息之后的第一条回复，同一会话内） ──
  const gaps: Record<Role, number[]> = { Y: [], H: [] };
  for (const s of sessions) {
    for (let i = s.startIdx + 1; i <= s.endIdx; i++) {
      const prev = msgs[i - 1], cur = msgs[i];
      if (cur.sender !== prev.sender) gaps[cur.sender].push((cur.ts - prev.ts) / 60_000);
    }
  }
  const replyMin = { Y: median(gaps.Y), H: median(gaps.H) };

  // ── 每天、每小时 ──
  const perDay = new Map<number, number>();
  const hours = new Array<number>(24).fill(0);
  for (const m of msgs) {
    const d = dayIndex(m.ts);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
    hours[new Date(m.ts).getUTCHours()]++;
  }
  let recordDay: Wrapped["recordDay"] = null;
  for (const [d, c] of perDay) if (!recordDay || c > recordDay.count) recordDay = { count: c, ts: d * DAY_MS };

  const active = [...perDay.keys()].sort((a, b) => a - b);
  let streakDays = active.length ? 1 : 0, run = 1, longestSilenceDays = 0;
  for (let i = 1; i < active.length; i++) {
    const gap = active[i] - active[i - 1];
    run = gap === 1 ? run + 1 : 1;
    streakDays = Math.max(streakDays, run);
    longestSilenceDays = Math.max(longestSilenceDays, gap - 1);
  }
  const late = hours.slice(22).reduce((a, b) => a + b, 0) + hours.slice(0, 4).reduce((a, b) => a + b, 0);
  const peakHour = hours.indexOf(Math.max(...hours));

  // ── 日历：最近最多 12 个月 ──
  const end = new Date(msgs[msgs.length - 1].ts);
  const startTs = msgs[0].ts;
  const calendar: WrappedMonth[] = [];
  for (let k = CALENDAR_MONTHS - 1; k >= 0; k--) {
    const y = end.getUTCFullYear(), mo = end.getUTCMonth() - k;
    const first = Date.UTC(y, mo, 1);
    const next = Date.UTC(y, mo + 1, 1);
    if (first < Date.UTC(new Date(startTs).getUTCFullYear(), 0, 1)) continue;
    const date = new Date(first);
    const n = Math.round((next - first) / DAY_MS);
    const days = Array.from({ length: n }, (_, i) => perDay.get(dayIndex(first) + i) ?? 0);
    calendar.push({ year: date.getUTCFullYear(), month: date.getUTCMonth(), label: MONTHS[date.getUTCMonth()], days });
  }
  const calendarMax = Math.max(1, ...calendar.flatMap(m => m.days));

  return {
    ...base, starts, calendar, calendarMax, replyMin, recordDay, streakDays, longestSilenceDays, hours,
    lateShare: msgs.length ? late / msgs.length : 0, peakHour,
  };
}
