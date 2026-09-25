/**
 * v3 故事式报告：服务器先算好确定性事实（今天、他最后一条消息、章节、反复出现的话），
 * 模型按章节写故事，原话只能通过证据 id 引用（页面按原消息渲染成气泡），再经本文件校验。
 * 详见 docs/prompt-architecture.md §3。
 */

import { franc } from "franc-min";
import { z } from "zod";
import type { EvidenceMsg } from "@/lib/analysis/analysis-types";
import { fmtDateLong } from "@/lib/format";
import { bannedHits, CAPS_WORD } from "./claim-checker";
import type { MeasuredFact } from "./narrative";
import { ReportValidationError } from "./narrative";
import type { SlimAnalysis } from "./payload";
import type { ReportStory, StoryBlock, StoryTeaser } from "./types";
import { maskText, stripMarkdown, type TeaserFacts } from "./teaser";
export { maskText, publicTeaser, stripMarkdown, type PublicTeaser, type TeaserFacts } from "./teaser";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CHAPTERS = 4;

// ── 确定性事实 ────────────────────────────────────────────────

export interface StoryChapterSpec { id: string; span: string; from: number; to: number }

export interface StoryContext {
  youName?: string;
  liteMode: boolean;
  /** 生成当天，例如 "September 24"。无时间戳时不给。 */
  today?: string;
  /** 今天是星期几，例如 "Thursday"。 */
  todayWeekday?: string;
  hisLastMessage?: { date: string; weekday?: string; daysAgo: string; evidenceId: number | null };
  /**
   * 聊天记录在哪天结束、最后一条是谁发的。导出的聊天不带导出日期，她可能几天前就导出了，
   * 所以结束之后有没有消息无从得知。
   */
  chatEnds?: { date: string; lastFrom: "you" | "him" };
  /** 聊天结束那天到今天隔了几天（英文单词）；给检查用，不交给模型。 */
  daysSinceEnd?: string;
  /** 证据消息在整段聊天里重复的次数与周数（只含重复过的），按消息 id。 */
  repeats: Record<number, { times: number; weeks: number }>;
  chapters: StoryChapterSpec[];
  /**
   * 没有转折点（稳定的聊天，或没有时间戳）时，章节按主题而不是按时间分：
   * 每章讲一种规律，可以引用任何日期的消息。只有一个时间段时，一章写不出一份值得付费的报告。
   */
  thematic: boolean;
  recurring: { from: "you" | "him"; weeks: string; evidenceIds: number[] }[];
}

const SMALL = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 0–99 写成英文单词，更大的数字保留数字。 */
export function numberWord(n: number): string {
  if (n < 20) return SMALL[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${SMALL[n % 10]}` : "");
  return String(n);
}

function daysAgoText(days: number): string {
  if (days <= 0) return "earlier today";
  if (days === 1) return "one day";
  return `${numberWord(days)} days`;
}

const weekdayOf = (ts: number) => new Date(ts).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

export function buildStoryContext(analysis: SlimAnalysis, evidence: EvidenceMsg[], now: number): StoryContext {
  const liteMode = analysis.preview.liteMode;
  const ids = new Set(evidence.map(e => e.id));
  const repeats = Object.fromEntries((analysis.repeats ?? []).filter(r => ids.has(r.id)).map(r => [r.id, { times: r.times, weeks: r.weeks }]));
  const recurring = (analysis.recurring ?? []).map(r => ({
    from: r.sender === "Y" ? "you" as const : "him" as const,
    weeks: `${numberWord(r.weeks)} different weeks`,
    evidenceIds: r.ids.filter(id => ids.has(id)),
  })).filter(r => r.evidenceIds.length);
  if (liteMode) return { youName: analysis.youName, liteMode, recurring, repeats, ...themes(evidence.length, "Across the messages you pasted", "The messages you pasted") };

  const [start, end] = analysis.range;
  const cuts = [...new Set(analysis.turningPoints.map(t => t.date))].filter(d => d > start && d <= end).sort((a, b) => a - b).slice(0, MAX_CHAPTERS - 1);
  const bounds = [start, ...cuts, end + 1];
  const chapters = bounds.slice(0, -1).map((from, i) => {
    const to = bounds[i + 1];
    const last = i === bounds.length - 2 ? end : to - DAY_MS;
    const a = fmtDateLong(from), b = fmtDateLong(Math.max(from, last));
    return { id: `c${i + 1}`, span: a === b ? a : `${a} – ${b}`, from: i === 0 ? -Infinity : from, to: i === bounds.length - 2 ? Infinity : to };
  });
  const his = analysis.last?.H;
  const days = his ? Math.floor(now / DAY_MS) - Math.floor(his.ts / DAY_MS) : NaN;
  const endGap = Math.floor(now / DAY_MS) - Math.floor(end / DAY_MS);
  const lastFrom = his && his.ts >= (analysis.last?.Y?.ts ?? -Infinity) ? "him" as const : "you" as const;
  const timed = chapters.length > 1 ? { chapters, thematic: false } : themes(evidence.length, "Across the whole chat", chapters[0].span);
  return {
    youName: analysis.youName, liteMode, today: fmtDateLong(now), todayWeekday: weekdayOf(now), ...timed, recurring, repeats,
    hisLastMessage: his && days >= 0 ? { date: fmtDateLong(his.ts), weekday: weekdayOf(his.ts), daysAgo: daysAgoText(days), evidenceId: ids.has(his.id) ? his.id : null } : undefined,
    chatEnds: { date: fmtDateLong(end), lastFrom },
    ...(endGap >= 1 ? { daysSinceEnd: numberWord(endGap) } : {}),
  };
}

/** 主题章节数：证据够多时三章，少一些两章，太少就只写一章。 */
function themes(evidenceCount: number, span: string, singleSpan: string): { chapters: StoryChapterSpec[]; thematic: boolean } {
  const n = evidenceCount >= 30 ? 3 : evidenceCount >= 12 ? 2 : 1;
  if (n === 1) return { chapters: [{ id: "c1", span: singleSpan, from: -Infinity, to: Infinity }], thematic: false };
  return { chapters: Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, span, from: -Infinity, to: Infinity })), thematic: true };
}

/** 这条消息能否在这一章引用：按时间分章时只能引用本章时间段内的；按主题分章时都可以。 */
export function fitsChapter(ctx: StoryContext, ts: number, chapterId: string): boolean {
  return ctx.thematic || chapterOf(ctx, ts) === chapterId;
}

export function chapterOf(ctx: StoryContext, ts: number): string {
  return (ctx.chapters.find(c => ts >= c.from && ts < c.to) ?? ctx.chapters[ctx.chapters.length - 1]).id;
}

/** "sent twelve times, in twelve different weeks"：给模型看的重复标注。 */
function repeatText(r: { times: number; weeks: number }, liteMode: boolean): string {
  const times = `sent ${numberWord(r.times)} times`;
  return liteMode || r.weeks < 2 ? `${times} in this chat` : `${times}, in ${numberWord(r.weeks)} different weeks`;
}

/** 她付款前已经读过的部分。开头与第一章正文由服务器原样填回，模型只需知道写过什么，接着往下写。 */
function fixedFacts(t: StoryTeaser) {
  return {
    title: t.title,
    opening: t.opening,
    ...(t.outline ? { chapterHeads: t.outline } : {}),
    ...(t.firstBlocks ? { firstChapterBlocks: t.firstBlocks } : {}),
  };
}

/** 给模型的数据：事实、章节与带日期/章节标注的证据。 */
export function storyUserData(ctx: StoryContext, question: string, questionId: string, facts: MeasuredFact[], evidence: EvidenceMsg[], fixedOpening?: StoryTeaser) {
  // 离今天几天不交给模型：聊天结束之后的空白不是证据（见 silenceClaim）
  const { chapters, repeats, daysSinceEnd: _gap, hisLastMessage, ...rest } = ctx;
  const his = hisLastMessage && { date: hisLastMessage.date, weekday: hisLastMessage.weekday, evidenceId: hisLastMessage.evidenceId };
  return {
    question, questionId,
    measuredFacts: facts.map(f => ({ id: f.id, text: f.text })),
    storyFacts: { ...rest, ...(his ? { hisLastMessage: his } : {}), chapters: chapters.map(c => ({ id: c.id, span: c.span })), ...(fixedOpening ? { fixedOpening: fixedFacts(fixedOpening) } : {}) },
    evidence: evidence.map(e => ({
      id: e.id,
      ...(ctx.liteMode ? {} : { date: fmtDateLong(e.ts), weekday: new Date(e.ts).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) }),
      ...(ctx.thematic ? {} : { chapter: chapterOf(ctx, e.ts) }), from: e.sender === "Y" ? "you" : "him", text: e.text,
      ...(repeats[e.id] ? { repeats: repeatText(repeats[e.id], ctx.liteMode) } : {}),
    })),
  };
}

// ── 结构 ─────────────────────────────────────────────────────

const text = z.string().trim().min(2).max(1500);
const block = z.union([z.object({ p: text }).strict(), z.object({ quote: z.number().int().nonnegative() }).strict()]);

export const storySchema = z.object({
  language: z.literal("en"),
  question: text.max(250),
  title: text.max(160),
  opening: z.array(text).min(1).max(5),
  chapters: z.array(z.object({
    id: z.string().max(10),
    span: z.string().max(80),
    emoji: z.string().trim().min(1).max(16),
    title: text.max(120),
    blocks: z.array(block).min(2).max(60),
  }).strict()).min(1).max(MAX_CHAPTERS),
  turn: z.object({ text, evidenceIds: z.array(z.number().int().nonnegative()).max(40) }).strict(),
  otherReading: text,
  read: text,
  yourSide: text,
  nextStep: z.object({
    question: text.max(600),
    why: text,
    howToAsk: text,
    watchFor: text,
    responseGuide: z.enum(["plans", "conversation"]),
    messageOptions: z.array(z.object({ tone: z.enum(["warm", "direct", "light"]), text: text.max(400) }).strict()).min(2).max(3),
    avoid: text,
    plan: text.max(2000),
  }).strict(),
  signoff: text.max(400),
}).strict();

// ── 校验 ─────────────────────────────────────────────────────

const NUMBER_RE = /\d+(?:[.,:]\d+)*%?/g;
const EXTRA_BANNED: [RegExp, string][] = [
  // 写成单词的实测比例（"seventeen percent"）可以；概率、胜算不行
  [/\bper ?cent (chance|likely)\b|\bprobability\b|\bodds (are|of)\b|\b(likelihood|chances) (is|are|of)\b/i, "prediction"],
  // "fake" 常出现在否定式安慰里（"not that it was fake"），不拦；只拦直接指控
  [/\b(he is|he's) (a liar|lying to you|playing you|using you)\b/i, "accusation"],
  // 给某种解释打分（"maybe forty percent"、"forty percent of the weight"）：即使数字碰巧和实测相同，也是估计的胜算
  [/\b(?:maybe|perhaps|say)\s+(?:a\s+)?[a-z]+(?:[- ][a-z]+)?[- ]?(?:per ?cent|percent)\b(?![^.!?]*\b(?:of (?:the )?(?:conversations|messages|chats|replies|questions|plans)|started|initiat))|\b(?:weight|odds|chance|confident|confidence|sure|certain)\b[^.!?]{0,50}\b(?:per ?cent|percent)\b|\b(?:per ?cent|percent)\b[^.!?]{0,30}\b(?:weight|odds|chance|sure|certain)\b/i, "odds"],
];

/** 自由文字的位置与内容；quote 块不算。 */
function proseEntries(s: ReportStory): Array<[string, string]> {
  const out: Array<[string, string]> = [["title", s.title], ["question", s.question]];
  s.opening.forEach((p, i) => out.push([`opening[${i}]`, p]));
  s.chapters.forEach((c, i) => {
    out.push([`chapters[${i}].title`, c.title]);
    c.blocks.forEach((b, j) => { if ("p" in b) out.push([`chapters[${i}].blocks[${j}]`, b.p]); });
  });
  out.push(["turn", s.turn.text], ["otherReading", s.otherReading], ["read", s.read], ["yourSide", s.yourSide], ["signoff", s.signoff]);
  const n = s.nextStep;
  out.push(["nextStep.question", n.question], ["nextStep.why", n.why], ["nextStep.howToAsk", n.howToAsk], ["nextStep.watchFor", n.watchFor], ["nextStep.avoid", n.avoid], ["nextStep.plan", n.plan]);
  n.messageOptions.forEach((m, i) => out.push([`nextStep.messageOptions[${i}]`, m.text]));
  return out;
}

/** 标题会被分享，不写数字。其余文字里的数字须出自实测数据、日期或原消息（例如约好的 "Saturday at 2"）。 */
const NO_DIGITS = /^title$/;

function allowedNumbers(ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): Set<string> {
  const sources = [
    ...facts.map(f => f.text), ...allowed, ctx.today ?? "", ctx.hisLastMessage?.date ?? "",
    ...Object.values(ctx.repeats).map(r => `${r.times} ${r.weeks}`),
    ...ctx.chapters.map(c => c.span), ...evidence.flatMap(e => [e.text, ctx.liteMode ? "" : fmtDateLong(e.ts)]),
  ];
  return new Set(sources.join(" ").match(NUMBER_RE) ?? []);
}

/** 故事里可以出现的数字字符串（原消息里的时间、证据日期、今天、章节日期），交给最终的 Claim Checker。 */
export function storyAllowedNumbers(ctx: StoryContext, evidence: EvidenceMsg[]): string[] {
  const text = [ctx.today ?? "", ctx.hisLastMessage?.date ?? "", ...ctx.chapters.map(c => c.span), ...evidence.flatMap(e => [e.text, ctx.liteMode ? "" : fmtDateLong(e.ts)])].join(" ");
  return [...new Set(text.match(NUMBER_RE) ?? [])];
}

const QUOTED_RE = /["“]([^"”]+)["”]/g;
/** 比较引用时忽略大小写、标点和空白差异。 */
function normQuote(s: string): string {
  return s.toLowerCase().replace(/’/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
}

interface TextEnv {
  nums: Set<string>;
  corpus: string[];
  /** 最后一条是他发的时，聊天结束的日期：和"没消息"写在一起就是在说导出之后的事。 */
  hisEnd?: string;
  daysSinceEnd?: string;
}

function textEnv(ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): TextEnv {
  return {
    nums: allowedNumbers(ctx, facts, evidence, allowed), corpus: evidence.map(e => normQuote(e.text)),
    hisEnd: ctx.chatEnds?.lastFrom === "him" ? ctx.chatEnds.date : undefined, daysSinceEnd: ctx.daysSinceEnd,
  };
}

/** 一直延续到现在的"没联系"（现在完成时 + since）。 */
const SINCE_SILENCE = /\b(?:haven't|have not|hasn't|has not)\s+(?:heard|written|texted|replied|messaged|reached out|said (?:a word|anything))\b[^.!?]{0,40}\bsince\b|\b(?:nothing|no (?:word|reply|message|messages|answer|text))(?: (?:at all|from him|from you))? since\b|\bsilence since\b|\bquiet ever since\b/i;
const GAP_WORDS = /\b(?:silen(?:ce|t)|quiet|nothing|absence|no (?:word|reply|message|messages|answer|text))\b/i;

/**
 * 把聊天结束之后说成"他再没联系"：导出不带日期，她可能几天前就导出了，这段时间有没有消息无从得知。
 * 聊天里面的空白（她发了几条他没回）是证据，照常可以写；这里只拦延续到今天的说法、
 * 和今天或聊天结束日期（最后一条是他发的时）写在一起的"没消息"，以及"四天没消息"这种正好等于结束至今天数的说法。
 */
function silenceClaim(t: string, env: TextEnv): boolean {
  if (SINCE_SILENCE.test(t)) return true;
  if (!GAP_WORDS.test(t)) return false;
  if (/\btoday\b|\bright now\b/i.test(t)) return true;
  if (env.hisEnd && t.includes(env.hisEnd)) return true;
  return Boolean(env.daysSinceEnd && new RegExp(`\\b${env.daysSinceEnd}[- ]days?\\b`, "i").test(t));
}

const WORD_VALUE: Record<string, number> = Object.fromEntries([
  ...SMALL.map((w, i) => [w, i] as const), ...TENS.flatMap((w, i) => w ? [[w, i * 10] as const] : []), ["hundred", 100] as const,
]);
const SPELLED_PERCENT = /\b([a-z]+)(?:[- ]([a-z]+))?[- ]?(?:per ?cent|percent)\b/gi;

/**
 * 用单词写的百分数：与实测数据相符（"seventeen percent" 对应 17%）可以；
 * 对不上的只会是估计的胜算或权重（"maybe forty percent"），不允许。
 */
function spelledOdds(t: string, nums: Set<string>): boolean {
  for (const m of t.matchAll(SPELLED_PERCENT)) {
    const a = WORD_VALUE[m[1].toLowerCase()];
    if (a === undefined) continue;
    const b = m[2] ? WORD_VALUE[m[2].toLowerCase()] : 0;
    const n = a + (b !== undefined && b < 10 ? b : 0);
    if (!nums.has(`${n}%`)) return true;
  }
  return false;
}

/** 一段文字违反了哪些规则（不含位置）。path 决定适用哪些规则。 */
function textIssueKinds(path: string, t: string, env: TextEnv): string[] {
  const kinds: string[] = [];
  const found = t.match(NUMBER_RE) ?? [];
  if (NO_DIGITS.test(path) && found.length) kinds.push("digits");
  else if (found.some(n => !env.nums.has(n))) kinds.push("number");
  if (bannedHits(t).length || EXTRA_BANNED.some(([re]) => re.test(t)) || spelledOdds(t, env.nums)) kinds.push("banned");
  if (CAPS_WORD.test(t)) kinds.push("tone");
  if (silenceClaim(t, env)) kinds.push("silence");
  // 正文里双引号内三个词以上的内容必须逐字出自证据；建议她发的话不算
  if (!path.startsWith("nextStep.") && path !== "title" && path !== "question") {
    for (const m of t.matchAll(QUOTED_RE)) {
      const q = normQuote(m[1]);
      if (q.split(" ").length >= 3 && !env.corpus.some(e => e.includes(q))) { kinds.push("misquote"); break; }
    }
  }
  return kinds;
}

/** 可以靠删掉个别句子修好的问题。 */
const SENTENCE_KINDS = new Set(["banned", "number", "misquote", "tone", "silence"]);

/**
 * 删掉违规的句子，保留其余内容。一整段都不合规时返回 null（由调用方决定删段或失败）。
 * 一句话出问题不该让整份付费报告作废。
 */
function pruneText(path: string, t: string, env: TextEnv): string | null {
  if (!textIssueKinds(path, t, env).some(k => SENTENCE_KINDS.has(k))) return t;
  const kept = t.split(/(?<=[.!?])\s+/).filter(s => !textIssueKinds(path, s, env).some(k => SENTENCE_KINDS.has(k)));
  return kept.length ? kept.join(" ") : null;
}

/** 这么长的句子在前文出现过，就是在复述（模型凑字数时常把整段数字或同一组引用再讲一遍）。 */
const REPEAT_MIN_WORDS = 8;

/**
 * 按句修剪整份故事：删掉违规的句子，以及前文已经出现过的长句。
 * 删空的段落、正文块、备选消息会被去掉；删不掉的保持原样，交给最终校验。
 */
function pruneStory(s: ReportStory, env: TextEnv): { story: ReportStory; removed: string[] } {
  const removed: string[] = [];
  const seen = new Set<string>();
  const dedupe = (path: string, t: string | null): string | null => {
    if (t === null || path.startsWith("nextStep.messageOptions") || path === "nextStep.question") return t;
    const kept = t.split(/(?<=[.!?])\s+/).filter(sentence => {
      const key = normQuote(sentence);
      if (key.split(" ").length < REPEAT_MIN_WORDS) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (kept.length !== t.split(/(?<=[.!?])\s+/).length) removed.push(`removed:repeat:${path}`);
    return kept.length ? kept.join(" ") : null;
  };
  const prune = (path: string, t: string) => {
    const out = pruneText(path, t, env);
    if (out !== t) removed.push(`removed:sentence:${path}`);
    return dedupe(path, out);
  };
  const keepOr = (path: string, t: string) => prune(path, t) ?? t;
  const opening = s.opening.map((p, i) => prune(`opening[${i}]`, p)).filter((p): p is string => p !== null);
  const chapters = s.chapters.map((c, i) => ({
    ...c,
    blocks: c.blocks.flatMap((b, j): StoryBlock[] => {
      if (!("p" in b)) return [b];
      const p = prune(`chapters[${i}].blocks[${j}]`, b.p);
      return p === null ? [] : [{ p }];
    }),
  }));
  const options = s.nextStep.messageOptions.map((m, i) => ({ m, text: prune(`nextStep.messageOptions[${i}]`, m.text) }));
  const keptOptions = options.filter(o => o.text !== null).map(o => ({ ...o.m, text: o.text! }));
  const n = s.nextStep;
  return {
    removed,
    story: {
      ...s,
      opening: opening.length ? opening : s.opening,
      chapters,
      turn: { ...s.turn, text: keepOr("turn", s.turn.text) },
      otherReading: keepOr("otherReading", s.otherReading),
      read: keepOr("read", s.read),
      yourSide: keepOr("yourSide", s.yourSide),
      signoff: keepOr("signoff", s.signoff),
      nextStep: {
        ...n,
        question: keepOr("nextStep.question", n.question), why: keepOr("nextStep.why", n.why),
        howToAsk: keepOr("nextStep.howToAsk", n.howToAsk), watchFor: keepOr("nextStep.watchFor", n.watchFor),
        avoid: keepOr("nextStep.avoid", n.avoid), plan: keepOr("nextStep.plan", n.plan),
        messageOptions: keptOptions.length >= 2 ? keptOptions : n.messageOptions,
      },
    },
  };
}

/** 正文逐段检查（数字、禁用说法、大写、引号内原话）、标题不带名字、全文英文。报告与开头预览共用。 */
function proseIssues(prose: Array<[string, string]>, title: string, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): string[] {
  const issues: string[] = [];
  const env = textEnv(ctx, facts, evidence, allowed);
  for (const [path, t] of prose) for (const kind of textIssueKinds(path, t, env)) issues.push(`${kind}:${path}`);
  // 标题可能被她选择公开分享，不能带名字
  if (ctx.youName && title.toLowerCase().split(/[^\p{L}'’-]+/u).includes(ctx.youName.toLowerCase())) issues.push("name:title");
  const joined = prose.map(([, t]) => t).join(" ");
  if (/[^\p{Script=Latin}\p{Mark}\P{Letter}]/u.test(joined) || franc(joined, { minLength: 40 }) !== "eng") issues.push("language:english_required");
  return issues;
}

/** 把某个时刻说成独一无二、打破规律的说法。 */
const UNIQUE_RE = /\b(?:the only (?:time|moment|exchange|day|night)|the one (?:time|moment|exchange|day|night) (?:where|when|that)|only once|for the first time|broke (?:the|this) (?:pattern|loop|routine)|breaks (?:the|this) (?:pattern|loop|routine)|breaking (?:the|this) (?:pattern|loop|routine)|off[- ]script|out of the (?:template|script|loop|routine)|step(?:s|ped)? out of (?:the|that|this)|not (?:a line )?from the (?:template|script)|something else came through)\b/i;

/** 这条消息属于固定套路：在三个以上不同的周（没有时间戳时，三次以上）出现过。 */
function routineWeeks(ctx: StoryContext, id: number): number {
  const r = ctx.repeats[id];
  if (!r) return 0;
  const n = ctx.liteMode ? r.times : r.weeks;
  return n >= 3 ? n : 0;
}

/**
 * 被说成“唯一一次”“打破了规律”的地方，旁边引用的却是每周都有的话：这是事实错误，必须重写。
 * 章节标题看整章的引用，正文段落看前后两块内的引用，turn 看它的证据。
 */
function uniqueClaimIssues(s: Pick<ReportStory, "chapters"> & { turn?: ReportStory["turn"] }, ctx: StoryContext, checkTitles = true): string[] {
  const issues: string[] = [];
  const worst = (ids: number[]) => Math.max(0, ...ids.map(id => routineWeeks(ctx, id)));
  s.chapters.forEach((c, i) => {
    const quotes = (blocks: StoryBlock[]) => blocks.flatMap(b => "quote" in b ? [b.quote] : []);
    if (checkTitles && UNIQUE_RE.test(c.title) && worst(quotes(c.blocks))) issues.push(`unique:chapters[${i}].title`);
    c.blocks.forEach((b, j) => {
      if ("p" in b && UNIQUE_RE.test(b.p) && worst(quotes(c.blocks.slice(Math.max(0, j - 2), j + 3)))) issues.push(`unique:chapters[${i}].blocks[${j}]`);
    });
  });
  if (s.turn && UNIQUE_RE.test(s.turn.text) && worst(s.turn.evidenceIds)) issues.push("unique:turn");
  return issues;
}

const WEEKDAYS = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const WEEKDAY_DATE = new RegExp(`\\b(${WEEKDAYS}),? (${MONTHS}) (\\d{1,2})\\b|\\b(${MONTHS}) (\\d{1,2})(?:st|nd|rd|th)?,? (?:was |is |on )?an? (${WEEKDAYS})\\b`, "g");

/** 星期几和日期写在一起时必须对得上（按证据日期、今天、他最后一条消息的日期核对）。 */
function weekdayIssues(prose: Array<[string, string]>, ctx: StoryContext, evidence: EvidenceMsg[]): string[] {
  if (ctx.liteMode) return [];
  const known = new Map<string, string>(evidence.map(e => [fmtDateLong(e.ts), weekdayOf(e.ts)]));
  if (ctx.today && ctx.todayWeekday) known.set(ctx.today, ctx.todayWeekday);
  if (ctx.hisLastMessage?.weekday) known.set(ctx.hisLastMessage.date, ctx.hisLastMessage.weekday);
  const issues: string[] = [];
  for (const [path, t] of prose) {
    for (const m of t.matchAll(WEEKDAY_DATE)) {
      const [weekday, date] = m[1] ? [m[1], `${m[2]} ${Number(m[3])}`] : [m[6], `${m[4]} ${Number(m[5])}`];
      const actual = known.get(date);
      if (actual && actual !== weekday) { issues.push(`weekday:${path}:${date} was a ${actual}`); break; }
    }
  }
  return issues;
}

/** 全篇至少引用这么多条原消息（证据不够时按证据数）。 */
const MIN_QUOTES = 8;

function collectIssues(s: ReportStory, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[], fixedHeads = false): string[] {
  const issues = proseIssues(proseEntries(s), s.title, ctx, facts, evidence, allowed);
  if (s.chapters.length !== ctx.chapters.length) issues.push("chapters:count");
  s.chapters.forEach((c, i) => {
    if (!c.blocks.some(b => "p" in b)) issues.push(`chapters[${i}]:needs_prose`);
    // 主题章节各讲一种规律，每章都要有原话撑着
    if (ctx.thematic && c.blocks.filter(b => "quote" in b).length < Math.min(2, evidence.length)) issues.push(`chapters[${i}]:needs_quotes`);
  });
  const quoted = new Set(s.chapters.flatMap(c => c.blocks.flatMap(b => "quote" in b ? [b.quote] : [])));
  if (quoted.size < Math.min(MIN_QUOTES, evidence.length)) issues.push("quotes:too_few");
  // 反复出现的原话是这类聊天最有说服力的证据：至少引用一条
  const recurringIds = ctx.recurring.flatMap(r => r.evidenceIds);
  if (recurringIds.length && !recurringIds.some(id => quoted.has(id))) issues.push(`recurring:unused:${recurringIds.slice(0, 8).join(",")}`);
  const n = s.nextStep;
  if (n.messageOptions.some(m => normQuote(m.text) === normQuote(n.question))) issues.push("nextStep:duplicate");
  // 付款前定下的章节标题已在预览时检查过，这里不能改，也就不再查
  issues.push(...uniqueClaimIssues(s, ctx, !fixedHeads), ...weekdayIssues(proseEntries(s), ctx, evidence));
  return [...new Set(issues)];
}

export function explainStoryIssues(issues: string[]): string[] {
  return issues.map(issue => {
    const [kind, ...rest] = issue.split(":");
    const at = rest.join(":");
    switch (kind) {
      case "digits": return `${at}: write no digits here at all; use words ("this weekend", "an evening").`;
      case "number": return `${at}: contains a number that is not in measuredFacts, storyFacts or the evidence. Remove it, or copy the measured fact exactly. Never write evidence ids in prose, and never count occurrences yourself.`;
      case "banned": return `${at}: remove certainty, accusations, diagnoses, probabilities or percent odds (including spelled-out ones like "forty percent"), predictions ("likely to", "will never", "won't change", "is going to"), directives, and any "he thinks/feels/wants" stated as a fact about him.`;
      case "tone": return `${at}: no all-caps words.`;
      case "silence": return `${at}: her chat ends on storyFacts.chatEnds.date and the export has no date, so you cannot know whether anything came after it. Do not say or imply that nothing has come since, or call the time after the chat ends a silence. Say "your chat ends on" that date instead.`;
      case "chapters": return "chapters: write exactly one chapter per storyFacts.chapters entry, in order.";
      case "quotes": return `chapters: quote at least ${MIN_QUOTES} different messages across the story with quote blocks (evidence ids from the matching chapter, or any date when storyFacts.thematic is true).`;
      case "recurring": return `chapters: quote at least one of the lines in storyFacts.recurring with a quote block (evidence ids ${rest.slice(1).join(":")}) and say what the repetition shows.`;
      case "nextStep": return "nextStep.messageOptions: each option must be worded differently from nextStep.question.";
      case "unique": return rest[1] === "heading"
        ? `${rest[0]}: a later chapter's title cannot promise a unique moment or a break from the pattern before that chapter is written. Name the theme instead.`
        : `${at}: this calls a moment unique, a first, or a break from the pattern, but the messages quoted there repeat in several different weeks (see their evidence.repeats). Describe them as part of the routine, or choose messages that have no repeats.`;
      case "weekday": return `${rest[0]}: wrong weekday; ${rest.slice(1).join(":")}. Use the weekday given in the evidence, or leave the weekday out.`;
      case "language": return "Write every field in English only.";
      case "name": return "title: do not include her name; the title may be shared publicly.";
      case "misquote": return `${at}: text inside double quotes must match a message in the evidence word for word. Copy it exactly, or paraphrase without quote marks.`;
      case "schema": {
        const [path, code, limit] = rest;
        if (code === "too_big") return `${path}: must be at most ${limit} (characters for text, items for lists).`;
        if (code === "too_small") return `${path}: must be at least ${limit} (characters for text, items for lists).`;
        return `${path}: must match the JSON shape (${code}).`;
      }
    }
    if (/^chapters\[\d+\]$/.test(kind)) return at === "needs_quotes" ? `${kind}: quote at least two messages in this chapter.` : `${kind}: add at least one prose block.`;
    return issue;
  });
}

function schemaIssue(i: z.core.$ZodIssue): string {
  const limit = i.code === "too_big" ? `:${String(i.maximum)}` : i.code === "too_small" ? `:${String(i.minimum)}` : "";
  return `schema:${i.path.join(".")}:${i.code}${limit}`;
}

/**
 * 校验故事。只做不增加内容的修复：格式规整、章节 id/span 按顺序换回服务器给的值、
 * 删掉引用了不存在或其他章节消息的 quote 块、删掉 turn 里未知的证据 id。
 * 其余问题交给模型带着说明重写。
 */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const TOP_KEYS = new Set(Object.keys(storySchema.shape));
const CHAPTER_KEYS = new Set(["id", "span", "emoji", "title", "blocks"]);

/** 只规整格式、不增加内容：去掉多余字段（如 GLM 的 title_note）、段落写成 {p}、引用编号写成字符串、段落与引用写进同一个对象。 */
function normalizeShape(value: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(value)) return { value, changed: false };
  let changed = false;
  const toBlocks = (b: unknown): unknown[] => {
    if (typeof b === "string") { changed = true; return [{ p: b }]; }
    if (!isRecord(b)) return [b];
    // "quote": null 等于没有引用
    const quote = b.quote === null ? undefined : typeof b.quote === "string" && /^\d+$/.test(b.quote) ? Number(b.quote) : b.quote;
    if (quote !== b.quote) changed = true;
    if (typeof b.p === "string") return quote === undefined ? [{ p: b.p }] : (changed = true, [{ p: b.p }, { quote }]);
    if (quote !== undefined && Object.keys(b).length > 1) { changed = true; return [{ quote }]; }
    return [quote !== undefined ? { quote } : b];
  };
  const opening = Array.isArray(value.opening) ? value.opening.map(o => {
    if (isRecord(o) && typeof o.p === "string") { changed = true; return o.p; }
    return o;
  }) : value.opening;
  const pick = (o: Record<string, unknown>, keys: Set<string>) => {
    const kept = Object.fromEntries(Object.entries(o).filter(([k]) => keys.has(k)));
    if (Object.keys(kept).length !== Object.keys(o).length) changed = true;
    return kept;
  };
  // 文字字段被包成 {"text": "..."}
  const unwrap = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).map(([k, v]) => {
    if (keys.includes(k) && isRecord(v) && Object.keys(v).length === 1 && typeof (v.text ?? v.p) === "string") { changed = true; return [k, v.text ?? v.p]; }
    return [k, v];
  }));
  const chapters = Array.isArray(value.chapters) ? value.chapters.map(c => isRecord(c) && Array.isArray(c.blocks) ? { ...pick(c, CHAPTER_KEYS), blocks: c.blocks.flatMap(toBlocks) } : c) : value.chapters;
  const top = unwrap(pick(value, TOP_KEYS), ["question", "title", "otherReading", "read", "yourSide", "signoff"]);
  if (isRecord(top.nextStep)) top.nextStep = unwrap(top.nextStep, ["question", "why", "howToAsk", "watchFor", "avoid", "plan"]);
  return { value: { ...top, opening, chapters }, changed };
}

/** 把对象里所有字符串的 Markdown 强调去掉；返回是否有改动。 */
function stripMarkdownDeep(value: unknown): { value: unknown; changed: boolean } {
  let changed = false;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") { const s = stripMarkdown(v); if (s !== v) changed = true; return s; }
    if (Array.isArray(v)) return v.map(walk);
    if (isRecord(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value), changed };
}

export function validateStoryWithRepairs(value: unknown, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[], opts: { fixedHeads?: boolean } = {}): { story: ReportStory; repairs: string[] } {
  const plain = stripMarkdownDeep(value);
  const normalized = normalizeShape(plain.value);
  const parsed = storySchema.safeParse(normalized.value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 12).map(schemaIssue);
    throw new ReportValidationError(issues, explainStoryIssues(issues));
  }
  const repairs: string[] = [...(normalized.changed ? ["coerced:shape"] : []), ...(plain.changed ? ["stripped:markdown"] : [])];
  const byId = new Map(evidence.map(e => [e.id, e]));
  const raw = parsed.data;
  // 同一条消息只引用一次
  const quoted = new Set<number>();
  const chapters = raw.chapters.map((c, i) => {
    const spec = ctx.chapters[i];
    if (spec && (c.id !== spec.id || c.span !== spec.span)) repairs.push(`restored:chapter:${i}`);
    const id = spec?.id ?? c.id;
    const blocks = c.blocks.filter((b): boolean => {
      if (!("quote" in b)) return true;
      const e = byId.get(b.quote);
      const ok = Boolean(e && fitsChapter(ctx, e.ts, id)) && !quoted.has(b.quote);
      if (!ok) repairs.push(`dropped:quote:${b.quote}`);
      quoted.add(b.quote);
      return ok;
    }) as StoryBlock[];
    return { ...c, id, span: spec?.span ?? c.span, blocks };
  });
  const turnIds = raw.turn.evidenceIds.filter(id => byId.has(id)).slice(0, 8);
  if (turnIds.length !== raw.turn.evidenceIds.length) repairs.push("dropped:turn_evidence");
  const assembled: ReportStory = { ...raw, chapters, turn: { ...raw.turn, evidenceIds: turnIds }, ...(ctx.youName ? { youName: ctx.youName } : {}) };
  const pruned = pruneStory(assembled, textEnv(ctx, facts, evidence, allowed));
  repairs.push(...pruned.removed);
  // 备选说法与主推消息一字不差时去掉这一条（至少留两条）
  let story = pruned.story;
  const next = story.nextStep;
  const distinct = next.messageOptions.filter(m => normQuote(m.text) !== normQuote(next.question));
  if (distinct.length >= 2 && distinct.length !== next.messageOptions.length) {
    story = { ...story, nextStep: { ...next, messageOptions: distinct } };
    repairs.push("dropped:duplicate_option");
  }
  const issues = collectIssues(story, ctx, facts, evidence, allowed, opts.fixedHeads);
  if (issues.length) throw new ReportValidationError(issues, explainStoryIssues(issues));
  return { story, repairs };
}

// ── 免费预览：报告的开头（付款前） ─────────────────────────────

const chapterHead = z.object({ id: z.string().max(10), emoji: z.string().trim().min(1).max(16), title: text.max(120) }).strict();

export const teaserSchema = z.object({
  language: z.literal("en"),
  title: text.max(160),
  opening: z.array(text).min(2).max(5),
  chapters: z.array(chapterHead).min(1).max(MAX_CHAPTERS),
  firstChapter: z.object({ blocks: z.array(block).min(2).max(30) }).strict(),
}).strict();

type TeaserDraft = { title: string; opening: string[]; outline: { id: string; emoji: string; title: string }[]; firstBlocks: StoryBlock[] };

/** 只规整格式：多余字段、段落写成 {p}/{text}、标题包成对象、引用编号写成字符串。 */
function normalizeTeaser(value: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(value)) return { value, changed: false };
  let changed = false;
  const kept: Record<string, unknown> = Object.fromEntries(Object.entries(value).filter(([k]) => k in teaserSchema.shape));
  if (Object.keys(kept).length !== Object.keys(value).length) changed = true;
  if (Array.isArray(kept.opening)) kept.opening = kept.opening.map(o => isRecord(o) && typeof (o.p ?? o.text) === "string" ? (changed = true, o.p ?? o.text) : o);
  if (isRecord(kept.title) && typeof kept.title.text === "string") { changed = true; kept.title = kept.title.text; }
  if (Array.isArray(kept.chapters)) kept.chapters = kept.chapters.map(c => {
    if (!isRecord(c)) return c;
    const head = Object.fromEntries(Object.entries(c).filter(([k]) => k === "id" || k === "emoji" || k === "title"));
    if (Object.keys(head).length !== Object.keys(c).length) changed = true;
    return head;
  });
  // 第一章写成了数组、或把 blocks 直接放在顶层
  const first = Array.isArray(kept.firstChapter) ? (changed = true, { blocks: kept.firstChapter }) : kept.firstChapter;
  if (isRecord(first)) {
    const shaped = normalizeShape({ chapters: [{ id: "c1", span: "", emoji: "x", title: "x", blocks: first.blocks }] });
    const blocks = (shaped.value as { chapters: { blocks: unknown }[] }).chapters[0].blocks;
    if (shaped.changed || Object.keys(first).length !== 1) changed = true;
    kept.firstChapter = { blocks };
  }
  return { value: kept, changed };
}

/**
 * 校验付款前写好的标题、开头、各章标题和第一章正文。付款后的完整报告会原样沿用它们，
 * 所以规则与完整报告相同：数字、禁用说法、引号内原话、英文、标题不带名字；第一章只能引用第一章的消息。
 */
export function validateTeaser(value: unknown, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): { teaser: TeaserDraft; repairs: string[] } {
  const plain = stripMarkdownDeep(value);
  const normalized = normalizeTeaser(plain.value);
  const parsed = teaserSchema.safeParse(normalized.value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 12).map(schemaIssue);
    throw new ReportValidationError(issues, explainStoryIssues(issues));
  }
  const repairs: string[] = [...(normalized.changed ? ["coerced:shape"] : []), ...(plain.changed ? ["stripped:markdown"] : [])];
  const env = textEnv(ctx, facts, evidence, allowed);
  const { title } = parsed.data;

  const pruned = parsed.data.opening.map((p, i) => pruneText(`opening[${i}]`, p, env));
  const kept = pruned.filter((p): p is string => p !== null);
  // 开头至少要两段；删不够就用原文，交给下面的校验
  const opening = kept.length >= 2 ? kept : parsed.data.opening;
  if (opening === kept) repairs.push(...pruned.flatMap((p, i) => p !== parsed.data.opening[i] ? [`removed:sentence:opening[${i}]`] : []));

  // 章节标题按顺序换回服务器给的 id；数量不对交给模型重写
  const outline = parsed.data.chapters.map((c, i) => {
    const id = ctx.chapters[i]?.id ?? c.id;
    if (id !== c.id) repairs.push(`restored:chapter:${i}`);
    return { ...c, id };
  });

  const byId = new Map(evidence.map(e => [e.id, e]));
  const firstId = ctx.chapters[0].id;
  const firstBlocks = parsed.data.firstChapter.blocks.flatMap((b, j): StoryBlock[] => {
    if ("quote" in b) {
      const e = byId.get(b.quote);
      if (e && fitsChapter(ctx, e.ts, firstId)) return [b];
      repairs.push(`dropped:quote:${b.quote}`);
      return [];
    }
    const p = pruneText(`chapters[0].blocks[${j}]`, b.p, env);
    if (p !== b.p) repairs.push(`removed:sentence:chapters[0].blocks[${j}]`);
    return p === null ? [] : [{ p }];
  });

  const prose: Array<[string, string]> = [
    ["title", title], ...opening.map((p, i): [string, string] => [`opening[${i}]`, p]),
    ...outline.map((c, i): [string, string] => [`chapters[${i}].title`, c.title]),
    ...firstBlocks.flatMap((b, j): Array<[string, string]> => "p" in b ? [[`chapters[0].blocks[${j}]`, b.p]] : []),
  ];
  const issues = proseIssues(prose, title, ctx, facts, evidence, allowed);
  if (outline.length !== ctx.chapters.length) issues.push("chapters:count");
  if (!firstBlocks.some(b => "p" in b)) issues.push("chapters[0]:needs_prose");
  // 第一章已经写好，按引用核对；后面几章还没写，标题不能先许诺“打破规律”的时刻
  issues.push(...uniqueClaimIssues({ chapters: [{ id: firstId, span: "", emoji: "", title: outline[0]?.title ?? "", blocks: firstBlocks }] }, ctx));
  outline.slice(1).forEach((c, i) => { if (UNIQUE_RE.test(c.title)) issues.push(`unique:chapters[${i + 1}].title:heading`); });
  issues.push(...weekdayIssues(prose, ctx, evidence));
  const firstEvidence = evidence.filter(e => fitsChapter(ctx, e.ts, firstId)).length;
  if (firstBlocks.filter(b => "quote" in b).length < Math.min(2, firstEvidence)) issues.push("quotes:too_few");
  const unique = [...new Set(issues)];
  if (unique.length) throw new ReportValidationError(unique, explainStoryIssues(unique));
  return { teaser: { title, opening, outline, firstBlocks }, repairs };
}

export function buildTeaserFacts(analysis: SlimAnalysis, evidence: EvidenceMsg[], now: number): TeaserFacts {
  const ctx = buildStoryContext(analysis, evidence, now);
  const his = evidence.filter(e => e.sender === "H").sort((a, b) => a.ts - b.ts);
  const tp = ctx.liteMode ? undefined : [...analysis.turningPoints].sort((a, b) => a.date - b.date)[0];
  const before = tp && his.filter(e => e.ts < tp.date).pop();
  const after = tp && his.find(e => e.ts >= tp.date);
  const line = (analysis.recurring ?? []).find(r => r.sender === "H" && r.weeks >= 3 && r.ids.some(id => evidence.some(e => e.id === id)));
  const lineMsg = line && evidence.find(e => line.ids.includes(e.id));
  return {
    youName: ctx.youName, liteMode: ctx.liteMode,
    hisLast: ctx.hisLastMessage && { date: ctx.hisLastMessage.date, daysAgo: ctx.hisLastMessage.daysAgo },
    change: tp && { date: fmtDateLong(tp.date), before: before?.text, afterMasked: after && maskText(after.text) },
    repeated: line && lineMsg && { weeks: numberWord(line.weeks), masked: maskText(lineMsg.text) },
    chapters: ctx.chapters.length,
    messages: evidence.length,
  };
}
