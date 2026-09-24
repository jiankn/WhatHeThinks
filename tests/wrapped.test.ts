import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapRoles, parseAny } from "@/lib/analysis";
import { buildWrapped } from "@/lib/analysis/wrapped";

const chat = readFileSync("reports/test-data/WhatsApp-Nora-Theo-fictional.txt", "utf8");

describe("buildWrapped", () => {
  const parsed = parseAny(chat);
  const w = buildWrapped(mapRoles(parsed.messages, "Nora", "Theo"), false, ["Nora", "Theo"]);

  it("counts messages and who starts", () => {
    expect(w.counts).toEqual({ Y: 364, H: 361 });
    expect(w.starts).toEqual({ Y: 0.5, H: 0.5 });
  });

  it("measures the rhythm", () => {
    expect(w.replyMin).toEqual({ Y: 5, H: 5 });
    expect(w.recordDay?.count).toBe(11);
    expect(w.streakDays).toBe(6);
    expect(w.longestSilenceDays).toBe(1);
    expect(w.peakHour).toBe(12);
    expect(w.hours.reduce((a, b) => a + b, 0)).toBe(725);
  });

  it("draws the calendar from January of the first year", () => {
    expect(w.calendar.map(m => m.label)).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]);
    expect(w.calendar[1].days).toHaveLength(28);
    expect(w.calendar.flatMap(m => m.days).reduce((a, b) => a + b, 0)).toBe(725);
  });

  it("finds the longest messages and the first and last conversations", () => {
    expect(w.longest.H?.words).toBe(17);
    expect(w.first?.lines[0]).toEqual({ mine: false, text: "Hey, how did your presentation go? Been thinking about you." });
    expect(w.last?.lines.at(-1)?.text).toBe("See you soon 😊");
  });

  it("keeps names and filler out of the top words", () => {
    expect(w.words.H).toContain("friday");
    for (const list of [w.words.Y, w.words.H]) expect(list).not.toContain("theo");
    expect(w.emojis.Y[0]).toBe("🙂");
  });

  it("skips time-based stats without timestamps", () => {
    const lite = parseAny(chat.split("\n").slice(1, 80).map(l => l.replace(/^[^-]+ - /, "")).join("\n"));
    const lw = buildWrapped(mapRoles(lite.messages, "Nora", "Theo"), true);
    expect(lw.calendar).toEqual([]);
    expect(lw.replyMin).toBeNull();
    expect(lw.counts.Y + lw.counts.H).toBe(79);
  });
});
