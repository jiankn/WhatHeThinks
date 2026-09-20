import { describe, it, expect } from "vitest";
import { sampleReport } from "@/lib/report/sample";
import { buildShareSnapshot } from "@/lib/report/share";
import { cleanEventProps } from "@/lib/events";
import { pickHeadline } from "@/lib/analysis/preview";
import type { TurningPoint } from "@/lib/analysis/analysis-types";

describe("public summary boundary", () => {
  it("never copies arbitrary report text, identifiers or dates", () => {
    const p = structuredClone(sampleReport.preview);
    p.headline!.sentence = "Alice secret@example.com #t=PRIVATE_TOKEN on May 18";
    const serialized = JSON.stringify(buildShareSnapshot(p));
    for (const secret of ["Alice", "secret@", "PRIVATE_TOKEN", "May 18", String(p.range[0])]) expect(serialized).not.toContain(secret);
    expect(JSON.parse(serialized).metrics).toHaveLength(2);
  });
  it("omits statistics when the owner hides them", () => {
    expect(buildShareSnapshot(sampleReport.preview, false).metrics).toEqual([]);
  });
  it("does not claim timing or changes for snippets without timestamps", () => {
    const p = { ...sampleReport.preview, liteMode: true };
    const snapshot = buildShareSnapshot(p);
    expect(snapshot.headline).toBe("A fresh look at our conversation.");
    expect(snapshot.metrics.map(m => m.label)).toEqual(["My share of messages", "His messages with questions"]);
    expect(JSON.stringify(snapshot)).not.toMatch(/reply|May|changed/);
  });
  it("accepts a warming result without reframing it as negative", () => {
    const p = structuredClone(sampleReport.preview);
    p.headline!.direction = "warming";
    expect(buildShareSnapshot(p).headline).toContain("momentum");
  });
});

describe("growth event privacy", () => {
  it("rejects arbitrary free text and URLs, but keeps constrained attribution", () => {
    expect(cleanEventProps({ source: "share", ref: "a".repeat(24), session: "abc-123", messages: 50, lite: true, token: "secret", question: "private words", url: "https://site/r/x#t=secret", campaign: "a@email.com", content: "hello world", n: Infinity })).toEqual({ source: "share", ref: "a".repeat(24), session: "abc-123", messages: 50, lite: true });
  });
  it("handles malformed event props", () => {
    for (const value of [null, [], 4, "hello"]) expect(cleanEventProps(value)).toEqual({});
  });
});

describe("balanced preview selection", () => {
  function point(direction: "warming" | "cooling", shift: number, date: number, confidence: TurningPoint["confidence"] = "high"): TurningPoint {
    const metrics = { initShare: .5, replyP50: 10, questionRatio: .1, msgShare: .5, avgLen: 20, plansPerWeek: 2, warmthRate: .1, dryRate: .1 };
    return { id: `${direction}-${date}`, date, direction, confidence, shift, before: metrics, after: metrics, drivers: [], evidenceIds: [], context: { yInitShareBefore: .5, yInitShareAfter: .5 } };
  }
  it("selects a stronger warming change over cooling", () => {
    const positive = point("warming", 2, 1);
    expect(pickHeadline([point("cooling", -1, 2), positive])).toBe(positive);
  });
  it("prioritizes evidence confidence and breaks equivalent ties by recency", () => {
    const best = point("warming", 1, 3);
    expect(pickHeadline([point("cooling", -8, 2, "medium"), point("cooling", -1, 1), best])).toBe(best);
    expect(pickHeadline([point("cooling", -10, 1, "low")])).toBeNull();
  });
});
