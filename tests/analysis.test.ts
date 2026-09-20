import { describe, it, expect } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import { genChat } from "./synth";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const START = Date.UTC(2024, 0, 1, 0, 0, 0);

describe("基础指标 sanity", () => {
  const a = analyzeRoleMsgs(genChat({ weeks: 12, seed: 1 }));
  it("产出会话、周与合计", () => {
    expect(a.totalSessions).toBeGreaterThan(10);
    expect(a.weeks.length).toBeGreaterThan(8);
    expect(a.totals.Y.msgCount + a.totals.H.msgCount).toBeGreaterThan(300);
  });
  it("发起占比在 0..1", () => {
    const { you, him } = a.preview.initiation;
    expect(you + him).toBeCloseTo(1, 5);
  });
  it("有证据产出", () => {
    expect(a.evidence.length).toBeGreaterThan(0);
    expect(a.evidence.every((e) => e.text.length <= 280)).toBe(true);
  });
});

describe("转折点检测", () => {
  it("植入第 6 周冷却，能检测到 cooling 且日期在 ±7 天内、confidence≥medium", () => {
    const a = analyzeRoleMsgs(genChat({ weeks: 12, coolAtWeek: 6, seed: 7 }));
    const cooling = a.turningPoints.filter((t) => t.direction === "cooling");
    expect(cooling.length).toBeGreaterThan(0);

    const targetTs = START + 6 * WEEK_MS;
    const near = cooling.find(
      (t) =>
        Math.abs(t.date - targetTs) <= 10 * DAY_MS &&
        t.confidence !== "low",
    );
    expect(near, "应有一个接近第6周的中/高置信度 cooling 转折点").toBeTruthy();
  });

  it("预览头条句子指向冷却", () => {
    const a = analyzeRoleMsgs(genChat({ weeks: 12, coolAtWeek: 6, seed: 7 }));
    expect(a.preview.headline).not.toBeNull();
    expect(a.preview.headline!.sentence).toMatch(
      /dropping|slower|shrinking/,
    );
  });

  it("预览的前后对比取自头条转折点，不混用全程指标", () => {
    const a = analyzeRoleMsgs(genChat({ weeks: 12, coolAtWeek: 6, seed: 7 }));
    const headline = a.preview.headline!;
    const point = a.turningPoints.find(p => p.date === headline.date)!;
    expect(headline.comparison).toEqual({
      initiation: { before: point.before.initShare, after: point.after.initShare },
      reply: { before: point.before.replyP50, after: point.after.replyP50 },
    });
    expect(headline.comparison!.initiation.after).toBeLessThan(headline.comparison!.initiation.before);
  });
});

describe("假阳性率", () => {
  it("无植入变化的聊天，high 转折点比例 < 10%（100 seeds）", () => {
    let highCount = 0;
    const N = 100;
    for (let seed = 1; seed <= N; seed++) {
      const a = analyzeRoleMsgs(genChat({ weeks: 12, seed }));
      if (a.turningPoints.some((t) => t.confidence === "high")) highCount++;
    }
    expect(highCount / N).toBeLessThan(0.1);
  });
});

describe("interest 等级", () => {
  it("冷却后整体投入下降，趋势标记 declining", () => {
    const a = analyzeRoleMsgs(genChat({ weeks: 12, coolAtWeek: 6, seed: 7 }));
    expect(["low", "moderate", "mixed", "strong"]).toContain(a.interest.level);
    expect(a.interest.trendDeclining).toBe(true);
  });
});
