/**
 * Claim Checker：报告的最后一道确定性关卡。mock 与未来的 LLM 输出都必须通过。
 * 详见 docs/prompt-architecture.md §6。
 */

import type { Claim, FullReport, ModuleKey } from "./types";

export type ViolationKind = "number" | "evidence" | "grounding" | "banned" | "hedge" | "tone";

export interface Violation {
  path: string;
  kind: ViolationKind;
  detail: string;
}

export interface CheckContext {
  /** Legacy templates require hedge tokens; evidence-led prose need not repeat them. */
  requireHedges?: boolean;
  /** FactBook 登记过的数字/日期字符串。 */
  allowed: string[];
  /** 本报告可引用的证据 id。 */
  evidenceIds: Set<number>;
}

const BANNED: [RegExp, string][] = [
  [/\b(definitely|certainly|guaranteed)\b|\b100% (sure|certain)\b/i, "absolute certainty"],
  [/\bcheat(s|ed|ing|er)?\b/i, "accusation"],
  [/\bnarcissis/i, "diagnosis"],
  [/\bgaslight/i, "diagnosis"],
  [/\bavoidant\b/i, "diagnosis"],
  [/\b(sociopath|psychopath)/i, "diagnosis"],
  [/\brun[.!]/i, "alarmist"],
  [/\bhe (loves|doesn't love|does not love) you\b/i, "mind reading"],
  [/\b\d+% chance\b/i, "prediction"],
  [/\b(will|going to) (break up|fail|end)\b/i, "prediction"],
  [/\b(leave|dump) him\b/i, "directive"],
  [/(?<!he said )\bhe (thinks|feels|wants) /i, "mind reading"],
];

const HEDGE = /\b(may|might|could|can|suggests?|consistent with|one possible|often|tends?)\b/i;
const CAPS_WORD = /\b[A-Z]{4,}\b/;

/** 剔除所有已登记字符串后，若仍含数字，则为未登记（编造）的数字。 */
export function unregisteredNumbers(text: string, allowed: string[]): string[] {
  let rest = text;
  for (const s of allowed) rest = rest.split(s).join("§");
  return rest.match(/[^\s§]*\d[^\s§]*/g) ?? [];
}

function checkText(path: string, text: string, ctx: CheckContext, out: Violation[]): void {
  for (const n of unregisteredNumbers(text, ctx.allowed)) {
    out.push({ path, kind: "number", detail: `unregistered number "${n}"` });
  }
  for (const [re, why] of BANNED) {
    const m = re.exec(text);
    if (m) out.push({ path, kind: "banned", detail: `${why}: "${m[0]}"` });
  }
  const caps = CAPS_WORD.exec(text);
  if (caps) out.push({ path, kind: "tone", detail: `all-caps "${caps[0]}"` });
}

function checkClaim(path: string, c: Claim, ctx: CheckContext, out: Violation[]): void {
  checkText(`${path}.fact`, c.fact, ctx, out);
  if (c.interpretation !== undefined) {
    checkText(`${path}.interpretation`, c.interpretation, ctx, out);
    if (ctx.requireHedges !== false && !HEDGE.test(c.interpretation)) {
      out.push({ path: `${path}.interpretation`, kind: "hedge", detail: "interpretation is not hedged" });
    }
  }
  for (const id of c.evidenceIds) {
    if (!ctx.evidenceIds.has(id)) out.push({ path, kind: "evidence", detail: `unknown evidence id ${id}` });
  }
  if (!/\d/.test(c.fact) && c.evidenceIds.length === 0) {
    out.push({ path, kind: "grounding", detail: "fact has no number, date or evidence" });
  }
}

/** 收集模块内全部文本，用于感叹号计数。 */
function moduleTexts(r: FullReport, key: ModuleKey): string[] {
  const claimTexts = (cs: Claim[]) => cs.flatMap((c) => [c.fact, c.interpretation ?? ""]);
  switch (key) {
    case "summary":
      return [r.summary.headline, ...r.summary.paragraphs, ...claimTexts(r.summary.claims)];
    case "interest":
      return [r.interest.note, ...r.interest.dimensions.map((d) => d.sentence), ...claimTexts(r.interest.claims)];
    case "investment":
      return [r.investment.takeaway, ...claimTexts(r.investment.claims)];
    case "timeline":
      return [
        r.timeline.emptyNote ?? "",
        ...r.timeline.points.flatMap((p) => [p.title, p.fact, p.interpretation, p.offlineCaveat, p.contextNote ?? "", p.conflictNote ?? ""]),
      ];
    case "mixedSignals":
      return [r.mixedSignals.combination, ...claimTexts(r.mixedSignals.interest), ...claimTexts(r.mixedSignals.distance)];
    case "nextStep":
      return [r.nextStep.question, r.nextStep.why, r.nextStep.howToAsk];
  }
}

export function checkReport(r: FullReport, ctx: CheckContext): Violation[] {
  const out: Violation[] = [];
  const t = (path: string, s: string | undefined) => s && checkText(path, s, ctx, out);

  t("summary.headline", r.summary.headline);
  r.summary.paragraphs.forEach((p, i) => t(`summary.paragraphs[${i}]`, p));
  r.summary.claims.forEach((c, i) => checkClaim(`summary.claims[${i}]`, c, ctx, out));

  t("interest.note", r.interest.note);
  r.interest.dimensions.forEach((d, i) => t(`interest.dimensions[${i}]`, d.sentence));
  r.interest.claims.forEach((c, i) => checkClaim(`interest.claims[${i}]`, c, ctx, out));

  t("investment.takeaway", r.investment.takeaway);
  r.investment.claims.forEach((c, i) => checkClaim(`investment.claims[${i}]`, c, ctx, out));

  t("timeline.emptyNote", r.timeline.emptyNote);
  r.timeline.points.forEach((p, i) => {
    const base = `timeline.points[${i}]`;
    t(`${base}.title`, p.title);
    t(`${base}.contextNote`, p.contextNote);
    t(`${base}.conflictNote`, p.conflictNote);
    t(`${base}.offlineCaveat`, p.offlineCaveat);
    p.rows.forEach((row, j) => {
      t(`${base}.rows[${j}].before`, row.before);
      t(`${base}.rows[${j}].after`, row.after);
    });
    checkClaim(base, { fact: p.fact, interpretation: p.interpretation, confidence: p.confidence, evidenceIds: p.evidenceIds }, ctx, out);
  });

  t("mixedSignals.combination", r.mixedSignals.combination);
  r.mixedSignals.interest.forEach((c, i) => checkClaim(`mixedSignals.interest[${i}]`, c, ctx, out));
  r.mixedSignals.distance.forEach((c, i) => checkClaim(`mixedSignals.distance[${i}]`, c, ctx, out));

  t("nextStep.question", r.nextStep.question);
  t("nextStep.why", r.nextStep.why);
  t("nextStep.howToAsk", r.nextStep.howToAsk);

  for (const key of r.order) {
    const bangs = moduleTexts(r, key).join(" ").split("!").length - 1;
    if (bangs > 1) out.push({ path: key, kind: "tone", detail: `${bangs} exclamation marks` });
  }
  return out;
}

/** 删除有问题的 claim（结论宁缺毋滥）；非 claim 文本的问题交由调用方决定（LLM 模式下重试）。 */
export function dropFailingClaims(r: FullReport, violations: Violation[]): FullReport {
  const bad = new Set(violations.map((v) => v.path.replace(/\.(fact|interpretation)$/, "")));
  const keep = (prefix: string) => (_: Claim, i: number) => !bad.has(`${prefix}[${i}]`);
  return {
    ...r,
    summary: { ...r.summary, claims: r.summary.claims.filter(keep("summary.claims")) },
    interest: { ...r.interest, claims: r.interest.claims.filter(keep("interest.claims")) },
    investment: { ...r.investment, claims: r.investment.claims.filter(keep("investment.claims")) },
    mixedSignals: {
      ...r.mixedSignals,
      interest: r.mixedSignals.interest.filter(keep("mixedSignals.interest")),
      distance: r.mixedSignals.distance.filter(keep("mixedSignals.distance")),
    },
  };
}
