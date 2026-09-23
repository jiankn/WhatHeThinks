import { franc } from "franc-min";
import { z } from "zod";
import { checkReport } from "./claim-checker";
import type { FullReport, ReportNarrative } from "./types";

// 硬上限留足余量：提示词要求 answer ≤700、其他 ≤600 字符，模型偶尔超出不应让付费报告失败退款。
const text = z.string().trim().min(8).max(1500);
const claim = z.object({
  fact: text,
  interpretation: text,
  confidence: z.enum(["high", "medium", "low"]),
  evidenceIds: z.array(z.number().int().nonnegative()).max(6),
  factId: z.string().max(60).nullable(),
}).strict();

export const narrativeSchema = z.object({
  language: z.literal("en"),
  question: text.max(250),
  headline: text.max(180),
  answer: text,
  supporting: z.array(claim).min(1).max(4),
  counterEvidence: z.array(claim).max(3),
  counterEvidenceNote: text,
  misread: text,
  limitation: text,
  nextStep: z.object({
    question: text.max(300),
    why: text,
    howToAsk: text,
    watchFor: text,
    responseGuide: z.enum(["plans", "conversation"]),
  }).strict(),
}).strict();

export interface MeasuredFact { id: string; text: string; evidenceIds: number[] }

/** Model can cite these facts, but cannot edit their values or attribution. */
export function measuredFacts(report: FullReport): MeasuredFact[] {
  const facts: MeasuredFact[] = [];
  const add = (text: string, evidenceIds: number[] = []) => {
    if (!facts.some(f => f.text === text)) facts.push({ id: `f${facts.length + 1}`, text, evidenceIds });
  };
  // Only observations, never the template's interpretations or conclusions.
  for (const c of [...report.summary.claims, ...report.interest.claims, ...report.investment.claims]) add(c.fact, c.evidenceIds);
  for (const point of report.timeline.points) add(point.fact, point.evidenceIds);
  for (const dim of report.interest.dimensions) if (/\d/.test(dim.sentence)) add(dim.sentence);
  return facts;
}

export class ReportValidationError extends Error {
  /** issues：规则编号，用于记录；hints：给模型的英文修改说明。 */
  constructor(readonly issues: string[], readonly hints: string[] = issues) {
    super("Report output failed validation");
    this.name = "ReportValidationError";
  }
}

/** 例如 schema:answer:too_big:900，既能记录，也能原样告诉模型如何修正。 */
function schemaIssue(i: z.core.$ZodIssue): string {
  const limit = i.code === "too_big" ? `:${String(i.maximum)}` : i.code === "too_small" ? `:${String(i.minimum)}` : "";
  return `schema:${i.path.join(".")}:${i.code}${limit}`;
}

const PROSE_FIELDS = ["question", "headline", "answer", "counterEvidenceNote", "misread", "limitation",
  "nextStep.question", "nextStep.why", "nextStep.howToAsk", "nextStep.watchFor"];

/** 所有规则检查。返回问题编号（只含字段位置与规则名，不含文本）。 */
function collectIssues(n: ReportNarrative, base: FullReport, facts: MeasuredFact[], evidenceIds: Set<number>, allowed: string[]): string[] {
  const issues: string[] = [];
  const allClaims = [...n.supporting, ...n.counterEvidence];
  const prose = [n.question, n.headline, n.answer, n.counterEvidenceNote, n.misread, n.limitation,
    n.nextStep.question, n.nextStep.why, n.nextStep.howToAsk, n.nextStep.watchFor];
  for (const [i, c] of allClaims.entries()) {
    const fact = facts.find(f => f.id === c.factId);
    if (c.factId !== null && (!fact || fact.text !== c.fact)) issues.push(`claim:${i}:copy_fact_verbatim`);
    if (c.factId === null && (!c.evidenceIds.length || /\d/.test(c.fact))) issues.push(`claim:${i}:cite_message_or_measured_fact`);
    if (c.evidenceIds.some(id => !evidenceIds.has(id))) issues.push(`claim:${i}:unknown_evidence`);
    // Numerical claims are confined to exact measured facts. No free-form numerical conclusions.
    if (/\d/.test(c.interpretation ?? "")) issues.push(`claim:${i}:no_numbers_in_interpretation`);
  }
  if (prose.some(s => /\d/.test(s))) issues.push("prose:no_numbers_outside_measured_facts");
  const generatedTexts = [...prose, ...allClaims.flatMap(c => [c.fact, c.interpretation ?? ""])];
  const joined = generatedTexts.join(" ");
  if (/[^\p{Script=Latin}\p{Mark}\P{Letter}]/u.test(joined) || franc(joined, { minLength: 40 }) !== "eng") issues.push("language:english_required");
  // Check longer individual fields too, so an English report cannot hide a foreign paragraph.
  if (generatedTexts.some(s => s.length >= 120 && franc(s, { minLength: 40 }) !== "eng")) issues.push("language:english_paragraphs_required");
  // Reuse the existing content checks, without forcing every interpretation to say "may".
  const checked: FullReport = {
    ...base,
    summary: { headline: n.headline, paragraphs: prose, claims: allClaims },
    nextStep: n.nextStep,
  };
  issues.push(...checkReport(checked, { allowed, evidenceIds, requireHedges: false }).map(v => `${v.kind}:${v.path}`));
  return [...new Set(issues)];
}

/** 问题属于哪一条观察（supporting 与 counterEvidence 连续编号）；不属于单条观察时返回 null。 */
function claimIndex(issue: string): number | null {
  const m = /^claim:(\d+):/.exec(issue) ?? /^\w+:summary\.claims\[(\d+)\]/.exec(issue);
  return m ? Number(m[1]) : null;
}

/** 把规则编号翻译成模型能照着改的英文说明。 */
export function explainIssues(issues: string[], supportingCount: number): string[] {
  const claim = (i: number) => i < supportingCount ? `supporting[${i}]` : `counterEvidence[${i - supportingCount}]`;
  const field = (path: string) => {
    const p = /^summary\.paragraphs\[(\d+)\]/.exec(path);
    if (p) return PROSE_FIELDS[Number(p[1])] ?? path;
    const c = /^summary\.claims\[(\d+)\](?:\.(\w+))?/.exec(path);
    if (c) return `${claim(Number(c[1]))}${c[2] ? `.${c[2]}` : ""}`;
    return path === "summary.headline" ? "headline" : path;
  };
  return issues.map(issue => {
    const [kind, ...rest] = issue.split(":");
    if (kind === "claim") {
      const who = claim(Number(rest[0]));
      switch (rest[1]) {
        case "copy_fact_verbatim": return `${who}: factId must be a measuredFacts id and fact must copy that entry's text exactly.`;
        case "cite_message_or_measured_fact": return `${who}: with factId null, fact must contain no digits and must cite at least one evidenceId. For a number, use a measuredFacts entry instead.`;
        case "unknown_evidence": return `${who}: cite only evidence ids that appear in USER_DATA.`;
        case "no_numbers_in_interpretation": return `${who}.interpretation: remove every digit.`;
      }
    }
    if (kind === "prose") return "question, headline, answer, notes and nextStep: remove every digit. Numbers belong only in copied measured facts.";
    if (kind === "language") return "Write every field in English only.";
    if (kind === "schema") {
      const [path, code, limit] = rest;
      if (code === "too_big") return `${path}: must be at most ${limit} (characters for text, items for lists).`;
      if (code === "too_small") return `${path}: must be at least ${limit} (characters for text, items for lists).`;
      return `${path}: must match the JSON schema (${code}); every text field is a non-empty string.`;
    }
    const at = field(rest.join(":"));
    if (kind === "number") return `${at}: contains a number that is not in measuredFacts. Remove it, or copy the measured fact exactly.`;
    if (kind === "banned") return `${at}: remove certainty, accusations, diagnoses, mind-reading, predictions or directives.`;
    if (kind === "tone") return `${at}: no all-caps words and at most one exclamation mark.`;
    if (kind === "evidence") return `${at}: cite only evidence ids that appear in USER_DATA.`;
    if (kind === "grounding") return `${at}: cite evidence or copy a measured fact.`;
    return issue;
  });
}

/**
 * 校验，并在问题只出在个别观察上时修复。只做“还原为实测原文”和“删减”，从不增加内容：
 * - 引用了实测数据但措辞不对的观察，换回实测数据原文；
 * - 仍不合规的单条观察删掉，至少保留 min(2, 原有条数) 条支持观察；
 * - 正文、语言、结构等其他部分有问题时不修，交给模型重写。
 */
export function validateNarrativeWithRepairs(value: unknown, base: FullReport, facts: MeasuredFact[], evidenceIds: Set<number>, allowed: string[]): { narrative: ReportNarrative; repairs: string[] } {
  const parsed = narrativeSchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(schemaIssue);
    throw new ReportValidationError(issues, explainIssues(issues, 0));
  }
  const n = parsed.data;
  const issues = collectIssues(n, base, facts, evidenceIds, allowed);
  if (!issues.length) return { narrative: n, repairs: [] };
  const fail = (): never => { throw new ReportValidationError(issues, explainIssues(issues, n.supporting.length)); };
  if (issues.some(i => claimIndex(i) === null)) fail();

  const original = [...n.supporting, ...n.counterEvidence];
  const restoredClaims = original.map(c => {
    const fact = facts.find(f => f.id === c.factId);
    return fact && fact.text !== c.fact ? { ...c, fact: fact.text } : c;
  });
  const split = n.supporting.length;
  const restored: ReportNarrative = { ...n, supporting: restoredClaims.slice(0, split), counterEvidence: restoredClaims.slice(split) };
  const remaining = collectIssues(restored, base, facts, evidenceIds, allowed).map(claimIndex);
  if (remaining.includes(null)) fail();
  const drop = new Set(remaining as number[]);
  const supporting = restored.supporting.filter((_, i) => !drop.has(i));
  const counterEvidence = restored.counterEvidence.filter((_, i) => !drop.has(i + split));
  if (supporting.length < Math.min(2, split)) fail();
  const repaired: ReportNarrative = { ...restored, supporting, counterEvidence };
  if (collectIssues(repaired, base, facts, evidenceIds, allowed).length) fail();
  return {
    narrative: repaired,
    repairs: [
      ...restoredClaims.flatMap((c, i) => c !== original[i] && !drop.has(i) ? [`restored:claim:${i}`] : []),
      ...[...drop].map(i => `dropped:claim:${i}`),
    ],
  };
}

export function validateNarrative(value: unknown, base: FullReport, facts: MeasuredFact[], evidenceIds: Set<number>, allowed: string[]): ReportNarrative {
  return validateNarrativeWithRepairs(value, base, facts, evidenceIds, allowed).narrative;
}
