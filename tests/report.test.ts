import { describe, it, expect } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import { buildUpload } from "@/lib/report/payload";
import { MockReportWriter } from "@/lib/report/mock-writer";
import { bannedHits, checkReport, dropFailingClaims, unregisteredNumbers } from "@/lib/report/claim-checker";
import type { ReportInput } from "@/lib/report/writer";
import { QUESTION_IDS, type QuestionId } from "@/lib/questions";
import { genChat, type GenOpts } from "./synth";

function input(opts: GenOpts, question: QuestionId = "losing_interest", lite = false): ReportInput {
  const a = analyzeRoleMsgs(genChat(opts), lite);
  const up = buildUpload(a, { question, youName: "Emma", himName: "Jake" });
  return { reportId: `r${opts.seed ?? 0}${question}`, question, customQuestion: null, analysis: up.analysis, evidence: up.evidence };
}

async function writeAndCheck(inp: ReportInput) {
  const { report, allowed } = await new MockReportWriter().write(inp);
  const violations = checkReport(report, { allowed, evidenceIds: new Set(inp.evidence.map((e) => e.id)) });
  return { report, allowed, violations };
}

describe("MockReportWriter 通过 Claim Checker", () => {
  it("冷却场景 × 所有问题：零违规", async () => {
    for (const q of QUESTION_IDS) {
      const { violations } = await writeAndCheck(input({ weeks: 16, coolAtWeek: 9, seed: 5 }, q));
      expect(violations, q).toEqual([]);
    }
  });

  it("稳定场景 × 20 个随机种子：零违规", async () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { violations } = await writeAndCheck(input({ weeks: 14, seed }, "likes_me"));
      expect(violations, `seed ${seed}`).toEqual([]);
    }
  });

  it("短聊天（不足以找转折点）：零违规且有说明", async () => {
    const { report, violations } = await writeAndCheck(input({ weeks: 2, seed: 3 }, "energy_changed"));
    expect(violations).toEqual([]);
    expect(report.timeline.points).toHaveLength(0);
    expect(report.timeline.emptyNote).toMatch(/at least 3 weeks/);
  });

  it("Lite 模式：零违规，无回复时间", async () => {
    const { report, violations } = await writeAndCheck(input({ weeks: 6, seed: 2 }, "likes_me", true));
    expect(violations).toEqual([]);
    expect(report.investment.rows.some((r) => r.key === "reply")).toBe(false);
    expect(report.timeline.emptyNote).toMatch(/timestamps/);
  });
});

describe("报告内容", () => {
  it("建议约见时使用计划回应指南，复合问题保留对话指南", async () => {
    const inp = input({ weeks: 12, seed: 9 }, "mixed_signals");
    inp.analysis.mixedSignals = [{ id: "vague_plans", side: "distance", evidenceIds: [] }];
    const { report, violations } = await writeAndCheck(inp);
    expect(violations).toEqual([]);
    expect(report.nextStep.responseGuide).toBe("plans");

    const ex = await writeAndCheck({ ...inp, question: "ex_came_back" });
    expect(ex.report.nextStep.question).toBe("What's different for you this time?");
    expect(ex.report.nextStep.responseGuide ?? "conversation").toBe("conversation");
  });

  it("稳定且投入的聊天可以建议约见，但开放式关系提问不套用邀约指南", async () => {
    const inp = input({ weeks: 12, seed: 9 }, "likes_me");
    inp.analysis.mixedSignals = [];
    inp.analysis.turningPoints = [];
    inp.analysis.interest.level = "strong";
    const { report } = await writeAndCheck(inp);
    expect(report.nextStep.responseGuide).toBe("plans");

    const open = await writeAndCheck({ ...inp, question: "situationship" });
    expect(open.report.nextStep.responseGuide ?? "conversation").toBe("conversation");
  });

  it("冷却场景：转折点叙述、模块顺序按问题调整", async () => {
    const { report } = await writeAndCheck(input({ weeks: 16, coolAtWeek: 9, seed: 5 }, "losing_interest"));
    expect(report.order[1]).toBe("timeline");
    expect(report.timeline.points.some((p) => p.direction === "cooling")).toBe(true);
    expect(report.summary.headline).toMatch(/dropped around/);
    expect(report.timeline.series.length).toBeGreaterThan(10);
  });

  it("转折点证据覆盖变化前后", async () => {
    const inp = input({ weeks: 16, coolAtWeek: 9, seed: 5 }, "losing_interest");
    const { report } = await writeAndCheck(inp);
    const ts = new Map(inp.evidence.map((e) => [e.id, e.ts]));
    for (const p of report.timeline.points) {
      const times = p.evidenceIds.map((id) => ts.get(id)!);
      expect(times.some((t) => t < p.date), p.id).toBe(true);
      expect(times.some((t) => t >= p.date), p.id).toBe(true);
    }
  });

  it("同一报告措辞确定", async () => {
    const inp = input({ weeks: 12, seed: 9 }, "likes_me");
    const a = await new MockReportWriter().write(inp);
    const b = await new MockReportWriter().write(inp);
    expect(a.report.summary.paragraphs).toEqual(b.report.summary.paragraphs);
  });
});

describe("bannedHits：读心免责声明", () => {
  it("整句都是否定式免责声明时放行，哪怕否定词与 he thinks/feels/wants 隔了别的词", () => {
    expect(bannedHits("I can't tell you what he feels.")).toEqual([]);
    expect(bannedHits("What I cannot tell from a chat log — and won't pretend to — is what any of this means for where he wants it to go.")).toEqual([]);
    expect(bannedHits("There is no way to know what he thinks about this.")).toEqual([]);
  });

  it("同一句没有否定词时仍然拦截，即使是比喻用法", () => {
    expect(bannedHits("He wants the second act of your story, not just the headline.")).not.toEqual([]);
    expect(bannedHits("He feels this is the right time.")).not.toEqual([]);
  });

  it("否定词在另一句时不放行本句的读心", () => {
    expect(bannedHits("I don't know much about him. He wants you to stay.")).not.toEqual([]);
  });

  it("转述他说过的话、她想知道的事，不算读心", () => {
    expect(bannedHits("He answered plainly that he feels that too.")).toEqual([]);
    expect(bannedHits("You told him you feel comfortable, and he replied that he feels it too.")).toEqual([]);
    expect(bannedHits("You can name it plainly: you want to know he wants the time too.")).toEqual([]);
    expect(bannedHits("Leans toward: he wants the comfort of you without the effort.")).not.toEqual([]);
  });

  it("if/whether/转述仍然放行（原有规则不受影响）", () => {
    expect(bannedHits("It gives him an easy opening if he wants to make a plan.")).toEqual([]);
    expect(bannedHits("He said he feels tired.")).toEqual([]);
  });
});

describe("Claim Checker 拦截", () => {
  const ctx = { allowed: ["48%", "March 5", "3 concrete plans"], evidenceIds: new Set([1, 2]) };

  it("未登记的数字", () => {
    expect(unregisteredNumbers("He started 48% on March 5", ctx.allowed)).toEqual([]);
    expect(unregisteredNumbers("He started 87% of chats", ctx.allowed)).toEqual(["87%"]);
    // 登记 "3 concrete plans" 不放行裸数字 3
    expect(unregisteredNumbers("3 times", ctx.allowed)).toEqual(["3"]);
    // 登记 "48%" 不放行 "148%"
    expect(unregisteredNumbers("148%", ctx.allowed)).toEqual(["1"]);
  });

  it("违禁语言、未加限定的解读、未知证据、无依据的事实", async () => {
    const { report, allowed } = await new MockReportWriter().write(input({ weeks: 16, coolAtWeek: 9, seed: 5 }));
    const bad = structuredClone(report);
    bad.summary.headline = "He's definitely a narcissist. Run!";
    bad.interest.claims.push(
      { fact: "He is distant.", interpretation: "He doesn't care.", confidence: "low", evidenceIds: [] },
      { fact: "He replied in 5 min.", interpretation: "This may matter.", confidence: "low", evidenceIds: [999999] },
    );
    const v = checkReport(bad, { allowed, evidenceIds: new Set(report.interest.claims.flatMap((c) => c.evidenceIds)) });
    const kinds = new Set(v.map((x) => x.kind));
    expect(kinds).toEqual(new Set(["banned", "hedge", "evidence", "grounding", "number"]));
    expect(v.filter((x) => x.kind === "banned").length).toBeGreaterThanOrEqual(3);

    const cleaned = dropFailingClaims(bad, v);
    expect(cleaned.interest.claims.map((c) => c.fact)).toEqual(report.interest.claims.map((c) => c.fact));
  });
});
