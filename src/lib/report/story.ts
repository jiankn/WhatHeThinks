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
import { maskText, type TeaserFacts } from "./teaser";
export { maskText, publicTeaser, type PublicTeaser, type TeaserFacts } from "./teaser";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CHAPTERS = 4;

// ── 确定性事实 ────────────────────────────────────────────────

export interface StoryChapterSpec { id: string; span: string; from: number; to: number }

export interface StoryContext {
  youName?: string;
  liteMode: boolean;
  /** 生成当天，例如 "September 24"。无时间戳时不给。 */
  today?: string;
  hisLastMessage?: { date: string; daysAgo: string; evidenceId: number | null };
  chapters: StoryChapterSpec[];
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

export function buildStoryContext(analysis: SlimAnalysis, evidence: EvidenceMsg[], now: number): StoryContext {
  const liteMode = analysis.preview.liteMode;
  const ids = new Set(evidence.map(e => e.id));
  const recurring = (analysis.recurring ?? []).map(r => ({
    from: r.sender === "Y" ? "you" as const : "him" as const,
    weeks: `${numberWord(r.weeks)} different weeks`,
    evidenceIds: r.ids.filter(id => ids.has(id)),
  })).filter(r => r.evidenceIds.length);
  if (liteMode) return { youName: analysis.youName, liteMode, chapters: [{ id: "c1", span: "The messages you pasted", from: -Infinity, to: Infinity }], recurring };

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
  return {
    youName: analysis.youName, liteMode, today: fmtDateLong(now), chapters, recurring,
    hisLastMessage: his && days >= 0 ? { date: fmtDateLong(his.ts), daysAgo: daysAgoText(days), evidenceId: ids.has(his.id) ? his.id : null } : undefined,
  };
}

export function chapterOf(ctx: StoryContext, ts: number): string {
  return (ctx.chapters.find(c => ts >= c.from && ts < c.to) ?? ctx.chapters[ctx.chapters.length - 1]).id;
}

/** 给模型的数据：事实、章节与带日期/章节标注的证据。 */
export function storyUserData(ctx: StoryContext, question: string, questionId: string, facts: MeasuredFact[], evidence: EvidenceMsg[], fixedOpening?: StoryTeaser) {
  const { chapters, ...rest } = ctx;
  return {
    question, questionId,
    measuredFacts: facts.map(f => ({ id: f.id, text: f.text })),
    storyFacts: { ...rest, chapters: chapters.map(c => ({ id: c.id, span: c.span })), ...(fixedOpening ? { fixedOpening: { title: fixedOpening.title, opening: fixedOpening.opening } } : {}) },
    evidence: evidence.map(e => ({
      id: e.id,
      ...(ctx.liteMode ? {} : { date: fmtDateLong(e.ts), weekday: new Date(e.ts).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) }),
      chapter: chapterOf(ctx, e.ts), from: e.sender === "Y" ? "you" : "him", text: e.text,
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

/** 标题会被分享；下一步的这三栏还会经过旧的 Claim Checker。这些地方不写数字。 */
const NO_DIGITS = /^(title|nextStep\.(question|why|howToAsk))$/;

function allowedNumbers(ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): Set<string> {
  const sources = [
    ...facts.map(f => f.text), ...allowed, ctx.today ?? "", ctx.hisLastMessage?.date ?? "",
    ...ctx.chapters.map(c => c.span), ...evidence.flatMap(e => [e.text, ctx.liteMode ? "" : fmtDateLong(e.ts)]),
  ];
  return new Set(sources.join(" ").match(NUMBER_RE) ?? []);
}

const QUOTED_RE = /["“]([^"”]+)["”]/g;
/** 比较引用时忽略大小写、标点和空白差异。 */
function normQuote(s: string): string {
  return s.toLowerCase().replace(/’/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
}

/** 正文逐段检查（数字、禁用说法、大写、引号内原话）、标题不带名字、全文英文。报告与开头预览共用。 */
function proseIssues(prose: Array<[string, string]>, title: string, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): string[] {
  const issues: string[] = [];
  const nums = allowedNumbers(ctx, facts, evidence, allowed);
  const corpus = evidence.map(e => normQuote(e.text));
  for (const [path, t] of prose) {
    const found = t.match(NUMBER_RE) ?? [];
    if (NO_DIGITS.test(path) && found.length) issues.push(`digits:${path}`);
    else if (found.some(n => !nums.has(n))) issues.push(`number:${path}`);
    if (bannedHits(t).length || EXTRA_BANNED.some(([re]) => re.test(t))) issues.push(`banned:${path}`);
    if (CAPS_WORD.test(t)) issues.push(`tone:${path}`);
    // 正文里双引号内三个词以上的内容必须逐字出自证据；建议她发的话不算
    if (!path.startsWith("nextStep.") && path !== "title" && path !== "question") {
      for (const m of t.matchAll(QUOTED_RE)) {
        const q = normQuote(m[1]);
        if (q.split(" ").length >= 3 && !corpus.some(e => e.includes(q))) { issues.push(`misquote:${path}`); break; }
      }
    }
  }
  // 标题可能被她选择公开分享，不能带名字
  if (ctx.youName && title.toLowerCase().split(/[^\p{L}'’-]+/u).includes(ctx.youName.toLowerCase())) issues.push("name:title");
  const joined = prose.map(([, t]) => t).join(" ");
  if (/[^\p{Script=Latin}\p{Mark}\P{Letter}]/u.test(joined) || franc(joined, { minLength: 40 }) !== "eng") issues.push("language:english_required");
  return issues;
}

function collectIssues(s: ReportStory, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): string[] {
  const issues = proseIssues(proseEntries(s), s.title, ctx, facts, evidence, allowed);
  if (s.chapters.length !== ctx.chapters.length) issues.push("chapters:count");
  s.chapters.forEach((c, i) => { if (!c.blocks.some(b => "p" in b)) issues.push(`chapters[${i}]:needs_prose`); });
  const quotes = s.chapters.flatMap(c => c.blocks.filter((b): b is { quote: number } => "quote" in b));
  if (quotes.length < Math.min(3, evidence.length)) issues.push("quotes:too_few");
  return [...new Set(issues)];
}

export function explainStoryIssues(issues: string[]): string[] {
  return issues.map(issue => {
    const [kind, ...rest] = issue.split(":");
    const at = rest.join(":");
    switch (kind) {
      case "digits": return `${at}: write no digits here at all; use words ("this weekend", "an evening").`;
      case "number": return `${at}: contains a number that is not in measuredFacts, storyFacts or the evidence. Remove it, or copy the measured fact exactly. Never write evidence ids in prose, and never count occurrences yourself.`;
      case "banned": return `${at}: remove certainty, accusations, diagnoses, probabilities or percent odds, predictions, directives, and any "he thinks/feels/wants" stated as a fact about him.`;
      case "tone": return `${at}: no all-caps words.`;
      case "chapters": return "chapters: write exactly one chapter per storyFacts.chapters entry, in order.";
      case "quotes": return "chapters: use quote blocks with evidence ids from the matching chapter; at least three across the story.";
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
    if (/^chapters\[\d+\]$/.test(kind)) return `${kind}: add at least one prose block.`;
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

export function validateStoryWithRepairs(value: unknown, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): { story: ReportStory; repairs: string[] } {
  const normalized = normalizeShape(value);
  const parsed = storySchema.safeParse(normalized.value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 12).map(schemaIssue);
    throw new ReportValidationError(issues, explainStoryIssues(issues));
  }
  const repairs: string[] = normalized.changed ? ["coerced:shape"] : [];
  const byId = new Map(evidence.map(e => [e.id, e]));
  const raw = parsed.data;
  const chapters = raw.chapters.map((c, i) => {
    const spec = ctx.chapters[i];
    if (spec && (c.id !== spec.id || c.span !== spec.span)) repairs.push(`restored:chapter:${i}`);
    const id = spec?.id ?? c.id;
    const blocks = c.blocks.filter((b): boolean => {
      if (!("quote" in b)) return true;
      const e = byId.get(b.quote);
      const ok = Boolean(e && chapterOf(ctx, e.ts) === id);
      if (!ok) repairs.push(`dropped:quote:${b.quote}`);
      return ok;
    }) as StoryBlock[];
    return { ...c, id, span: spec?.span ?? c.span, blocks };
  });
  const turnIds = raw.turn.evidenceIds.filter(id => byId.has(id)).slice(0, 8);
  if (turnIds.length !== raw.turn.evidenceIds.length) repairs.push("dropped:turn_evidence");
  const story: ReportStory = { ...raw, chapters, turn: { ...raw.turn, evidenceIds: turnIds }, ...(ctx.youName ? { youName: ctx.youName } : {}) };
  const issues = collectIssues(story, ctx, facts, evidence, allowed);
  if (issues.length) throw new ReportValidationError(issues, explainStoryIssues(issues));
  return { story, repairs };
}

// ── 免费预览：报告的开头（付款前） ─────────────────────────────

export const teaserSchema = z.object({
  language: z.literal("en"),
  title: text.max(160),
  opening: z.array(text).min(2).max(4),
}).strict();

/** 校验付款前写好的标题与开头。只做格式规整；付款后的完整报告会原样沿用它们。 */
export function validateTeaser(value: unknown, ctx: StoryContext, facts: MeasuredFact[], evidence: EvidenceMsg[], allowed: string[]): { teaser: { title: string; opening: string[] }; repairs: string[] } {
  let changed = false;
  let v = value;
  if (isRecord(v)) {
    const kept = Object.fromEntries(Object.entries(v).filter(([k]) => k in teaserSchema.shape));
    if (Object.keys(kept).length !== Object.keys(v).length) changed = true;
    if (Array.isArray(kept.opening)) kept.opening = kept.opening.map(o => isRecord(o) && typeof (o.p ?? o.text) === "string" ? (changed = true, o.p ?? o.text) : o);
    if (isRecord(kept.title) && typeof kept.title.text === "string") { changed = true; kept.title = kept.title.text; }
    v = kept;
  }
  const parsed = teaserSchema.safeParse(v);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 12).map(schemaIssue);
    throw new ReportValidationError(issues, explainStoryIssues(issues));
  }
  const { title, opening } = parsed.data;
  const prose: Array<[string, string]> = [["title", title], ...opening.map((p, i): [string, string] => [`opening[${i}]`, p])];
  const issues = [...new Set(proseIssues(prose, title, ctx, facts, evidence, allowed))];
  if (issues.length) throw new ReportValidationError(issues, explainStoryIssues(issues));
  return { teaser: { title, opening }, repairs: changed ? ["coerced:shape"] : [] };
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
