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
  constructor(readonly issues: string[]) {
    super("Report output failed validation");
    this.name = "ReportValidationError";
  }
}

/** 例如 schema:answer:too_big:900，既能记录，也能原样告诉模型如何修正。 */
function schemaIssue(i: z.core.$ZodIssue): string {
  const limit = i.code === "too_big" ? `:${String(i.maximum)}` : i.code === "too_small" ? `:${String(i.minimum)}` : "";
  return `schema:${i.path.join(".")}:${i.code}${limit}`;
}

export function validateNarrative(value: unknown, base: FullReport, facts: MeasuredFact[], evidenceIds: Set<number>, allowed: string[]): ReportNarrative {
  const parsed = narrativeSchema.safeParse(value);
  if (!parsed.success) throw new ReportValidationError(parsed.error.issues.map(schemaIssue));
  const n = parsed.data;
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
    if (/\d/.test(c.interpretation)) issues.push(`claim:${i}:no_numbers_in_interpretation`);
  }
  if (prose.some(s => /\d/.test(s))) issues.push("prose:no_numbers_outside_measured_facts");
  const generatedTexts = [...prose, ...allClaims.flatMap(c => [c.fact, c.interpretation])];
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
  if (issues.length) throw new ReportValidationError([...new Set(issues)]);
  return n;
}
