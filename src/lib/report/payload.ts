/**
 * 浏览器 → 服务器的上传数据。详见 docs/PRD.md §5.3。
 *
 * 只上传派生数据：聚合指标、周序列、转折点、混合信号，以及 ≤120 条证据摘录。
 * 证据里的姓名、邮箱、电话在离开浏览器前被替换；只单独上传“你”的名字（首个词），
 * 用于报告称呼她。他的名字从不上传。完整聊天永不上传。
 */

import type {
  Analysis,
  EvidenceMsg,
  PersonMetrics,
  WeekBucket,
} from "@/lib/analysis/analysis-types";
import { CUSTOM_QUESTION_MAX, isQuestionId, type QuestionId } from "@/lib/questions";
import type { StoryTeaser } from "./types";

export const PAYLOAD_VERSION = 1;
export const MAX_EVIDENCE = 120;
export const MAX_EVIDENCE_TEXT = 300;
/** 请求体上限（字节）。 */
export const MAX_BODY_BYTES = 1_500_000;

/** 去掉逐条延迟样本与命中 id 的单人指标。 */
export type SlimPersonMetrics = Omit<PersonMetrics, "replyLatencies" | "hits"> & {
  /** 仅保留出现在证据集中的命中 id。 */
  hits?: Record<string, number[]>;
};

export interface SlimWeek extends Omit<WeekBucket, "Y" | "H"> {
  Y: SlimPersonMetrics;
  H: SlimPersonMetrics;
}

export type SlimAnalysis = Omit<Analysis, "totals" | "weeks" | "evidence"> & {
  totals: { Y: SlimPersonMetrics; H: SlimPersonMetrics };
  weeks: SlimWeek[];
  /** 她的名字（聊天显示名的首个词），报告用来称呼她；取不到时不传。 */
  youName?: string;
  /** 服务器写入的免费预览开头；上传时带的一律丢弃。 */
  teaser?: StoryTeaser;
};

const FIRST_NAME_RE = /^\p{L}[\p{L}'’-]{1,23}$/u;
const NOT_A_NAME = new Set(["me", "you", "i", "my", "him", "her"]);

/** 从聊天显示名取名字：首个字母词，首字母大写；电话号码、“Me”之类返回 undefined。 */
export function firstName(display: string): string | undefined {
  const word = display.normalize("NFC").split(/[\s._,|/()-]+/).map(t => t.replace(/[^\p{L}'’-]/gu, "")).find(t => /\p{L}/u.test(t));
  if (!word || !FIRST_NAME_RE.test(word) || NOT_A_NAME.has(word.toLowerCase())) return undefined;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export interface ReportUpload {
  v: typeof PAYLOAD_VERSION;
  question: QuestionId;
  customQuestion?: string;
  analysis: SlimAnalysis;
  evidence: EvidenceMsg[];
}

// ── 客户端：构建 ──────────────────────────────────────────────

function slimPerson(p: PersonMetrics, keepIds?: Set<number>): SlimPersonMetrics {
  const { replyLatencies: _l, hits, ...rest } = p;
  if (!keepIds) return rest;
  const kept: Record<string, number[]> = {};
  for (const [k, ids] of Object.entries(hits)) {
    const f = ids.filter((id) => keepIds.has(id));
    if (f.length) kept[k] = f;
  }
  return { ...rest, hits: kept };
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const URL_RE = /https?:\/\/\S+/gi;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 显示名拆成可替换的词：去掉 emoji/符号，保留长度 ≥2 的字母词。 */
function nameTokens(name: string): string[] {
  return name
    .split(/[\s._-]+/)
    .map((t) => t.replace(/[^\p{L}\p{N}']/gu, ""))
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
}

/** 替换证据中的姓名、邮箱、电话、链接。 */
export function redactText(text: string, youName: string, himName: string): string {
  let out = text
    .replace(URL_RE, "[link]")
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, "[phone]");
  const pairs: [string, string][] = [
    ...nameTokens(himName).map((t) => [t, "[him]"] as [string, string]),
    ...nameTokens(youName).map((t) => [t, "[you]"] as [string, string]),
  ];
  for (const [tok, rep] of pairs) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(tok)}(?![\\p{L}\\p{N}])`, "giu"), rep);
  }
  return out;
}

export function buildUpload(
  analysis: Analysis,
  opts: {
    question: QuestionId;
    customQuestion?: string;
    youName: string;
    himName: string;
  },
): ReportUpload {
  const evidence = analysis.evidence.slice(0, MAX_EVIDENCE).map((e) => ({
    ...e,
    text: redactText(e.text, opts.youName, opts.himName).slice(0, MAX_EVIDENCE_TEXT),
  }));
  const keep = new Set(evidence.map((e) => e.id));
  const { totals, weeks, evidence: _e, ...rest } = analysis;
  return {
    v: PAYLOAD_VERSION,
    question: opts.question,
    customQuestion:
      opts.question === "custom" && opts.customQuestion
        ? opts.customQuestion.trim().slice(0, CUSTOM_QUESTION_MAX)
        : undefined,
    analysis: {
      ...rest,
      recurring: rest.recurring?.map((r) => ({ ...r, ids: r.ids.filter((id) => keep.has(id)) })).filter((r) => r.ids.length),
      repeats: rest.repeats?.filter((r) => keep.has(r.id)),
      ...(firstName(opts.youName) ? { youName: firstName(opts.youName) } : {}),
      totals: { Y: slimPerson(totals.Y, keep), H: slimPerson(totals.H, keep) },
      weeks: weeks.map((w) => ({ ...w, Y: slimPerson(w.Y), H: slimPerson(w.H) })),
    },
    evidence,
  };
}

// ── 服务端：校验 ──────────────────────────────────────────────

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 校验上传数据的结构与上限。返回错误信息，或 null 表示通过。 */
export function validateUpload(body: unknown): string | null {
  if (!isObj(body)) return "body must be an object";
  if (body.v !== PAYLOAD_VERSION) return "unsupported payload version";
  if (!isQuestionId(body.question)) return "invalid question";
  if (body.customQuestion !== undefined) {
    if (typeof body.customQuestion !== "string" || body.customQuestion.length > CUSTOM_QUESTION_MAX)
      return "invalid customQuestion";
  }

  const a = body.analysis;
  if (!isObj(a)) return "missing analysis";
  if (!isObj(a.totals) || !isObj(a.totals.Y) || !isObj(a.totals.H)) return "invalid totals";
  if (!Array.isArray(a.weeks) || a.weeks.length > 1000) return "invalid weeks";
  if (!Array.isArray(a.turningPoints) || a.turningPoints.length > 10) return "invalid turningPoints";
  if (!Array.isArray(a.mixedSignals) || a.mixedSignals.length > 20) return "invalid mixedSignals";
  if (!isObj(a.interest)) return "invalid interest";
  if (!Array.isArray(a.range) || !isNum(a.range[0]) || !isNum(a.range[1])) return "invalid range";
  if (a.youName !== undefined && (typeof a.youName !== "string" || !FIRST_NAME_RE.test(a.youName))) return "invalid youName";
  if (a.recurring !== undefined) {
    if (!Array.isArray(a.recurring) || a.recurring.length > 12) return "invalid recurring";
    for (const r of a.recurring) {
      if (!isObj(r) || (r.sender !== "Y" && r.sender !== "H") || !isNum(r.count) || !isNum(r.weeks)) return "invalid recurring";
      if (!Array.isArray(r.ids) || r.ids.length > 3 || !r.ids.every(isNum)) return "invalid recurring";
      if ((r.firstTs !== undefined && !isNum(r.firstTs)) || (r.lastTs !== undefined && !isNum(r.lastTs))) return "invalid recurring";
    }
  }
  if (a.repeats !== undefined) {
    if (!Array.isArray(a.repeats) || a.repeats.length > MAX_EVIDENCE) return "invalid repeats";
    for (const r of a.repeats) if (!isObj(r) || !isNum(r.id) || !isNum(r.times) || !isNum(r.weeks)) return "invalid repeats";
  }
  if (a.last !== undefined) {
    if (!isObj(a.last)) return "invalid last";
    for (const who of [a.last.Y, a.last.H]) if (who !== undefined && (!isObj(who) || !isNum(who.id) || !isNum(who.ts))) return "invalid last";
  }

  const p = a.preview;
  if (!isObj(p) || !isNum(p.totalMessages) || !isNum(p.activeDays)) return "invalid preview";
  if (!isObj(p.initiation) || !isObj(p.medianReply) || !isObj(p.counts)) return "invalid preview";

  const ev = body.evidence;
  if (!Array.isArray(ev) || ev.length > MAX_EVIDENCE) return "invalid evidence";
  for (const e of ev) {
    if (!isObj(e) || !isNum(e.id) || !isNum(e.ts)) return "invalid evidence item";
    if (e.sender !== "Y" && e.sender !== "H") return "invalid evidence sender";
    if (typeof e.text !== "string" || e.text.length > MAX_EVIDENCE_TEXT) return "invalid evidence text";
  }
  return null;
}
