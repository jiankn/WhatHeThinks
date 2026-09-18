/**
 * WhatsApp 聊天导出解析器。纯逻辑，运行在浏览器（Web Worker）中。
 * 详见 docs/signal-scoring-spec.md §1。
 *
 * 支持格式：
 *   iOS       [1/15/24, 9:41:05 PM] Jake: hey
 *   iOS 24h   [15.01.24, 21:41:05] Jake: hey
 *   Android   1/15/24, 9:41 PM - Jake: hey
 *   Android24 15/01/2024, 21:41 - Jake: hey
 */

import type { DateOrder, Msg, MsgType, ParseResult } from "./types";

// ── 1.1 规范化 ────────────────────────────────────────────────
// 去除方向控制/零宽字符；窄空格与不间断空格替换为普通空格；统一换行。
const INVISIBLE_RE = /[‎‏‪-‮﻿]/g;
const NBSP_RE = /[  ]/g;

export function normalize(raw: string): string {
  return raw
    .replace(INVISIBLE_RE, "")
    .replace(NBSP_RE, " ")
    .replace(/\r\n?/g, "\n");
}

// ── 1.2 行头正则 ──────────────────────────────────────────────
// date：日期，分隔符 / . -，年 2 或 4 位。
const DATE = String.raw`\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}`;
// time：时:分(:秒可选)，AM/PM 可选（允许 a.m. 形式）。normalize 后窄空格已成普通空格。
const TIME = String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?[Mm]\.?)?`;

// 方括号型（iOS）。sender 可选：无 "Name: " 即系统消息。
const IOS_RE = new RegExp(
  String.raw`^\[(${DATE}),\s*(${TIME})\]\s*(?:([^:]+?):\s)?(.*)$`,
);
// 破折号型（Android）。date 后以 " - "（空格包围）分隔，避免与日期内 "-" 冲突。
const ANDROID_RE = new RegExp(
  String.raw`^(${DATE}),\s*(${TIME})\s-\s(?:([^:]+?):\s)?(.*)$`,
);

interface HeaderMatch {
  d1: number;
  d2: number;
  year: number;
  hour: number;
  min: number;
  sec: number;
  sender: string | null;
  text: string;
}

/** 解析一行的行头。非行头返回 null。 */
function matchHeader(line: string): HeaderMatch | null {
  const m = IOS_RE.exec(line) ?? ANDROID_RE.exec(line);
  if (!m) return null;
  const [, dateStr, timeStr, sender, text] = m;

  const dateParts = dateStr.split(/[/.\-]/).map((x) => parseInt(x, 10));
  if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) return null;

  // 找出 4 位年份的位置；WhatsApp 年份在末尾，偶有开头。
  let year: number;
  let d1: number;
  let d2: number;
  if (dateParts[0] > 31) {
    // YYYY/M/D
    [year, d1, d2] = dateParts;
  } else {
    [d1, d2] = dateParts;
    year = dateParts[2];
  }
  if (year < 100) year += 2000;

  const time = parseTime(timeStr);
  if (!time) return null;

  return {
    d1,
    d2,
    year,
    hour: time.hour,
    min: time.min,
    sec: time.sec,
    sender: sender ? sender.trim() : null,
    text,
  };
}

function parseTime(
  timeStr: string,
): { hour: number; min: number; sec: number } | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([APap]\.?[Mm]\.?)?$/.exec(
    timeStr.trim(),
  );
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = m[3] ? parseInt(m[3], 10) : 0;
  const ampm = m[4]?.toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  if (hour > 23 || min > 59 || sec > 59) return null;
  return { hour, min, sec };
}

// ── 1.2 日期顺序检测 ─────────────────────────────────────────
function detectDateOrder(headers: HeaderMatch[]): DateOrder {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const h of headers) {
    if (h.d1 > 12) firstOver12 = true;
    if (h.d2 > 12) secondOver12 = true;
  }
  if (firstOver12 && !secondOver12) return "DMY";
  if (secondOver12 && !firstOver12) return "MDY";
  // 两者都出现过 >12（数据脏）时以第一字段为准判 DMY；都未出现则 ambiguous。
  if (firstOver12 && secondOver12) return "DMY";
  return "ambiguous";
}

// ── 1.3 消息类型识别 ─────────────────────────────────────────
const MEDIA_RE =
  /^(<Media omitted>|(image|video|sticker|gif|audio|document|contact card|media) omitted|.*\battached\b.*)$/i;
const DELETED_RE = /^(This message was deleted|You deleted this message)\.?$/i;
const CALL_RE = /^(Missed )?(voice|video) call$/i;
const EDITED_RE = /\s*<This message was edited>\s*$/i;
// iOS 导出会把部分系统提示挂在某个参与者名下（如首行的加密提示），按正文识别并丢弃。
const SYSTEM_TEXT_RE =
  /^(Messages and calls are end-to-end encrypted|Messages to this chat and calls are now secured|Your security code with .+ changed|.+ changed (their|his|her) phone number|You (blocked|unblocked) this contact|Disappearing messages were turned (on|off)|.+ turned (on|off) disappearing messages|Waiting for this message)/i;

function classify(text: string): { type: MsgType; text: string } {
  const clean = text.replace(EDITED_RE, "").trim();
  if (DELETED_RE.test(clean)) return { type: "deleted", text: clean };
  if (CALL_RE.test(clean)) return { type: "call", text: clean };
  if (MEDIA_RE.test(clean)) return { type: "media", text: clean };
  return { type: "text", text: clean };
}

// ── 主入口 ───────────────────────────────────────────────────
export interface ParseOptions {
  /** 强制日期顺序。用于检测结果为 ambiguous 时，由用户在 UI 中切换。 */
  forceDateOrder?: "MDY" | "DMY";
}

export function parseWhatsApp(raw: string, opts: ParseOptions = {}): ParseResult {
  const text = normalize(raw);
  const lines = text.split("\n");

  // 第一遍：切出行头与续行。
  interface Raw {
    header: HeaderMatch;
    lines: string[];
  }
  const raws: Raw[] = [];
  let systemLineCount = 0;

  for (const line of lines) {
    const header = matchHeader(line);
    if (header) {
      if (header.sender === null) {
        // 有时间戳但无 "Name:" → 系统消息，丢弃。
        systemLineCount++;
        continue;
      }
      raws.push({ header, lines: [header.text] });
    } else {
      // 续行：追加到上一条消息；无归属的行（如导出开头说明）丢弃。
      if (raws.length > 0) {
        if (line.length > 0) raws[raws.length - 1].lines.push(line);
      } else if (line.trim().length > 0) {
        systemLineCount++;
      }
    }
  }

  const dateOrder = detectDateOrder(raws.map((r) => r.header));
  const useDMY = (opts.forceDateOrder ?? dateOrder) === "DMY";

  const messages: Msg[] = [];
  const counts = new Map<string, number>();

  raws.forEach((r, i) => {
    const h = r.header;
    const month = useDMY ? h.d2 : h.d1;
    const day = useDMY ? h.d1 : h.d2;
    const ts = Date.UTC(h.year, month - 1, day, h.hour, h.min, h.sec);
    if (Number.isNaN(ts)) return;

    const joined = r.lines.join("\n");
    if (SYSTEM_TEXT_RE.test(joined.trim())) {
      systemLineCount++;
      return;
    }
    const { type, text: cleanText } = classify(joined);

    messages.push({
      id: i,
      ts,
      sender: h.sender as string,
      text: cleanText,
      type,
    });
    counts.set(h.sender as string, (counts.get(h.sender as string) ?? 0) + 1);
  });

  const participants = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    messages,
    participants,
    dateOrder,
    systemLineCount,
    hadTimestamps: messages.length > 0,
  };
}

// ── Lite 模式：无时间戳的 "Name: message" 粘贴文本 ─────────────
// 用于用户直接粘贴对话。时间戳按 1 分钟间隔合成，只作排序用；
// analyze() 据 hadTimestamps=false 进入 Lite 模式（无回复时间/转折点）。
const PLAIN_RE = /^([^:\n]{1,40}):\s+(.+)$/;
const LITE_BASE_TS = Date.UTC(2000, 0, 1);

export function parsePlainLines(raw: string): ParseResult {
  const lines = normalize(raw).split("\n");
  const messages: Msg[] = [];
  const counts = new Map<string, number>();
  let systemLineCount = 0;

  for (const line of lines) {
    const m = PLAIN_RE.exec(line.trim());
    if (m) {
      const sender = m[1].trim();
      const { type, text } = classify(m[2]);
      messages.push({ id: messages.length, ts: LITE_BASE_TS + messages.length * 60_000, sender, text, type });
      counts.set(sender, (counts.get(sender) ?? 0) + 1);
    } else if (messages.length > 0 && line.trim()) {
      messages[messages.length - 1].text += "\n" + line.trim();
    } else if (line.trim()) {
      systemLineCount++;
    }
  }

  const participants = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { messages, participants, dateOrder: "ambiguous", systemLineCount, hadTimestamps: false };
}

/** 先按 WhatsApp 导出格式解析，失败再退到 Lite 模式。 */
export function parseAny(raw: string, opts: ParseOptions = {}): ParseResult {
  const r = parseWhatsApp(raw, opts);
  if (r.messages.length > 0) return r;
  return parsePlainLines(raw);
}
