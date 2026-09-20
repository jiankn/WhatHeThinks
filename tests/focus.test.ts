import { describe, it, expect } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import type { Preview } from "@/lib/analysis/analysis-types";
import { suggestFocus } from "@/lib/report/focus";
import { genChat } from "./synth";

describe("suggestFocus 数据驱动侧重点", () => {
  it("有降温转折点时，第一条推荐引用具体日期", () => {
    const a = analyzeRoleMsgs(genChat({ weeks: 16, coolAtWeek: 9, seed: 3 }));
    const s = suggestFocus(a.preview);
    expect(a.preview.headline).not.toBeNull();
    expect(s[0].id).toBe("losing_interest");
    expect(s[0].label).toMatch(/since \w{3} \d+/);
    expect(s[0].reason).not.toBe(a.preview.headline!.sentence);
    expect(s[0].reason).toMatch(/ to /);
  });

  it("最多 3 条且不重复", () => {
    const a = analyzeRoleMsgs(genChat({ weeks: 16, coolAtWeek: 9, seed: 3 }));
    const s = suggestFocus(a.preview);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(new Set(s.map((o) => o.id)).size).toBe(s.length);
  });

  it("没有明显信号时回落到通用问题", () => {
    const p: Preview = {
      totalMessages: 100, activeDays: 10, range: [0, 1], liteMode: false, headline: null,
      initiation: { you: 0.5, him: 0.5 }, medianReply: { you: 5, him: 6 },
      messageShare: { you: 0.5, him: 0.5 }, questionRatio: { you: 0.2, him: 0.2 },
      counts: { turningPoints: 0, mixedSignals: 0, evidence: 0, shifts: 0 },
    };
    expect(suggestFocus(p).map((o) => o.id)).toEqual(["likes_me", "situationship"]);
  });

  it("她主动开启大多数对话时推荐投入对比", () => {
    const p: Preview = {
      totalMessages: 100, activeDays: 10, range: [0, 1], liteMode: false, headline: null,
      initiation: { you: 0.72, him: 0.28 }, medianReply: { you: 5, him: 6 },
      messageShare: { you: 0.6, him: 0.4 }, questionRatio: { you: 0.2, him: 0.2 },
      counts: { turningPoints: 0, mixedSignals: 2, evidence: 0, shifts: 0 },
    };
    const s = suggestFocus(p);
    expect(s.map((o) => o.id)).toEqual(["mixed_signals", "more_invested", "likes_me"]);
    expect(s[1].reason).toContain("72%");
  });
});
