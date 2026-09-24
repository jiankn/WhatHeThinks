import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze, analyzeRoleMsgs, parseAny } from "@/lib/analysis";
import { buildUpload, firstName, validateUpload } from "@/lib/report/payload";
import { MockReportWriter } from "@/lib/report/mock-writer";
import { measuredFacts, ReportValidationError } from "@/lib/report/narrative";
import { buildStoryContext, chapterOf, explainStoryIssues, numberWord, validateStoryWithRepairs } from "@/lib/report/story";
import type { ReportStory } from "@/lib/report/types";
import { parseJsonContent } from "@/lib/server/llm-writer";
import { storyFixture } from "./story-fixture";
import { genChat } from "./synth";

const NOW = Date.UTC(2026, 8, 24, 9);

async function setup(lite = false, seed = 5) {
  const upload = buildUpload(analyzeRoleMsgs(genChat({ weeks: 12, coolAtWeek: 7, seed }), lite), { question: "overview", youName: "Emma Stone 🌸", himName: "Jake" });
  const { report, allowed } = await new MockReportWriter().write({ reportId: "t", question: "overview", customQuestion: null, analysis: upload.analysis, evidence: upload.evidence });
  const facts = measuredFacts(report);
  const ctx = buildStoryContext(upload.analysis, upload.evidence, NOW);
  const story = storyFixture(ctx, upload.evidence);
  const validate = (value: unknown) => validateStoryWithRepairs(value, ctx, facts, upload.evidence, allowed);
  return { upload, ctx, story, facts, allowed, validate };
}

const withBlock = (s: ReportStory, text: string): ReportStory => ({ ...s, chapters: s.chapters.map((c, i) => i === 0 ? { ...c, blocks: [...c.blocks, { p: text }] } : c) });

describe("first name", () => {
  it("keeps only the first word of her display name", () => {
    expect(firstName("Emily")).toBe("Emily");
    expect(firstName("emily rose 💕")).toBe("Emily");
    expect(firstName("💕 Zoë")).toBe("Zoë");
    expect(firstName("O'Brien")).toBe("O'Brien");
  });

  it("gives no name for phone numbers, placeholders or single letters", () => {
    for (const name of ["+1 555 010 2000", "Me", "You", "J", "🙂", ""]) expect(firstName(name), name).toBeUndefined();
  });

  it("uploads her first name only, never his, and validates it", () => {
    const up = buildUpload(analyzeRoleMsgs(genChat({ weeks: 6, seed: 3 })), { question: "overview", youName: "Emma Stone", himName: "Jake Miller" });
    expect(up.analysis.youName).toBe("Emma");
    expect(JSON.stringify(up)).not.toMatch(/Jake|Miller|Stone/);
    expect(validateUpload(up)).toBeNull();
    expect(validateUpload({ ...up, analysis: { ...up.analysis, youName: "<script>" } })).toMatch(/youName/);
  });
});

describe("story context", () => {
  it("anchors today, his last message and one chapter per turning point", async () => {
    const f = await setup();
    expect(f.ctx.youName).toBe("Emma");
    expect(f.ctx.today).toBe("September 24");
    expect(f.ctx.chapters.length).toBe(f.upload.analysis.turningPoints.length + 1);
    expect(f.ctx.hisLastMessage?.daysAgo).toMatch(/days$|one day|earlier today/);
    for (const e of f.upload.evidence) expect(f.ctx.chapters.map(c => c.id)).toContain(chapterOf(f.ctx, e.ts));
  });

  it("uses a single untimed chapter and no dates in lite mode", async () => {
    const f = await setup(true);
    expect(f.ctx.chapters).toEqual([expect.objectContaining({ id: "c1", span: "The messages you pasted" })]);
    expect(f.ctx.today).toBeUndefined();
    expect(f.ctx.hisLastMessage).toBeUndefined();
  });

  it("finds weekly repeats and keeps the latest exchange in the evidence", () => {
    const raw = readFileSync("reports/test-data/WhatsApp-Emily-Jake-fictional.txt", "utf8");
    const analysis = analyze(parseAny(raw, { forceDateOrder: "MDY" }), "Emily", "Jake");
    const up = buildUpload(analysis, { question: "overview", youName: "Emily", himName: "Jake" });
    const ctx = buildStoryContext(up.analysis, up.evidence, NOW);
    expect(ctx.today).toBe("September 24");
    expect(ctx.hisLastMessage).toMatchObject({ date: "September 12", daysAgo: "twelve days" });
    expect(ctx.hisLastMessage?.evidenceId).not.toBeNull();
    expect(ctx.recurring.length).toBeGreaterThan(0);
    const texts = up.evidence.map(e => e.text);
    expect(texts).toContain("hey, miss you");
    expect(texts).toContain("I would like an actual plan when you know your schedule.");
    expect(up.evidence.length).toBeLessThanOrEqual(120);
    expect(ctx.chapters[0].span).toBe("June 22 – August 1");
  });

  it("writes small numbers as words", () => {
    expect([numberWord(0), numberWord(12), numberWord(21), numberWord(40), numberWord(140)]).toEqual(["zero", "twelve", "twenty-one", "forty", "140"]);
  });
});

describe("story contract", () => {
  it("accepts a grounded story across ten synthetic chats and lite mode, adding her name", async () => {
    for (let seed = 1; seed <= 10; seed++) {
      const f = await setup(seed % 2 === 0, seed);
      const { story, repairs } = f.validate(f.story);
      expect(story.youName, `seed ${seed}`).toBe("Emma");
      expect(repairs, `seed ${seed}`).toEqual([]);
    }
  });

  it("restores chapter ids and spans, and drops quotes that are unknown or from another chapter", async () => {
    const f = await setup();
    const other = f.upload.evidence.find(e => chapterOf(f.ctx, e.ts) !== "c1")!;
    const input = { ...f.story, chapters: f.story.chapters.map((c, i) => i === 0 ? { ...c, id: "x", span: "whenever", blocks: [...c.blocks, { quote: 999999 }, { quote: other.id }] } : c) };
    const { story, repairs } = f.validate(input);
    expect(story.chapters[0]).toMatchObject({ id: "c1", span: f.ctx.chapters[0].span });
    expect(story.chapters[0].blocks).toEqual(f.story.chapters[0].blocks);
    expect(repairs).toEqual(["restored:chapter:0", "dropped:quote:999999", `dropped:quote:${other.id}`]);
  });

  it.each([
    ["an invented number", "He went quiet for 37 days in a row.", "number:chapters[0]"],
    ["an evidence id in prose", "Look at message 999999 again.", "number:chapters[0]"],
    ["mind reading", "Leans toward: he wants the comfort of you without the effort.", "banned:chapters[0]"],
    ["probability", "I would put the odds of a comeback low, maybe forty percent.", "banned:chapters[0]"],
    ["an accusation", "Honestly, he is playing you.", "banned:chapters[0]"],
    ["a misquote", "He wrote \u201cI will always make time for you\u201d and then vanished.", "misquote:chapters[0]"],
  ])("rejects %s", async (_label, text, issue) => {
    const f = await setup();
    expect(() => f.validate(withBlock(f.story, text))).toThrow(expect.objectContaining({ issues: [expect.stringContaining(issue)] }));
  });

  it("keeps digits, names and foreign language out of the shareable parts", async () => {
    const f = await setup();
    expect(() => f.validate({ ...f.story, title: "Emma and the Porch Light: A Summer Story" })).toThrow(expect.objectContaining({ issues: ["name:title"] }));
    expect(() => f.validate({ ...f.story, title: "The Friday at 7 Club: A Summer Story" })).toThrow(expect.objectContaining({ issues: ["digits:title"] }));
    expect(() => f.validate({ ...f.story, nextStep: { ...f.story.nextStep, question: "Are you free Friday at 7?" } })).toThrow(ReportValidationError);
    expect(f.validate({ ...f.story, turn: { ...f.story.turn, evidenceIds: f.upload.evidence.slice(0, 12).map(e => e.id) } }).story.turn.evidenceIds).toHaveLength(8);
    expect(() => f.validate({ ...f.story, read: "这段聊天不能证明对方的感受，需要进一步沟通，也不能说明他以后会怎么做。" })).toThrow(expect.objectContaining({ issues: ["language:english_required"] }));
  });

  it("requires every chapter and enough real quotes", async () => {
    const f = await setup();
    expect(() => f.validate({ ...f.story, chapters: f.story.chapters.slice(0, 1) })).toThrow(expect.objectContaining({ issues: expect.arrayContaining(["chapters:count"]) }));
    const noQuotes = { ...f.story, chapters: f.story.chapters.map(c => ({ ...c, blocks: c.blocks.filter(b => "p" in b) })) };
    expect(() => f.validate(noQuotes)).toThrow(expect.objectContaining({ issues: ["quotes:too_few"] }));
  });

  it("allows gentle negations and measured shares written in words", async () => {
    const f = await setup();
    expect(() => f.validate(withBlock(f.story, "I am not telling you those weeks were fake. His share of starts fell to about seventeen percent. It gives him an easy opening if he wants to make a plan. I can't tell you what he thinks or feels, and he says he feels busy."))).not.toThrow();
  });

  it("accepts exact quotes of the evidence in prose, ignoring case and punctuation", async () => {
    const f = await setup();
    const words = f.upload.evidence.find(e => e.text.split(" ").length >= 4)!.text;
    expect(() => f.validate(withBlock(f.story, `You wrote \u201c${words.toLowerCase()}\u201d and meant it.`))).not.toThrow();
  });

  it("allows numbers copied from measured facts and the quoted messages", async () => {
    const f = await setup();
    const fact = f.facts.find(x => /\d/.test(x.text))!;
    expect(() => f.validate(withBlock(f.story, `The measured pattern is plain: ${fact.text}`))).not.toThrow();
  });

  it("explains each rule in words the model can act on", () => {
    const hints = explainStoryIssues(["number:read", "digits:title", "name:title", "chapters:count", "schema:read:too_big:1500"]);
    expect(hints[0]).toContain("Never write evidence ids in prose");
    expect(hints[1]).toMatch(/^title: write no digits/);
    expect(hints[2]).toContain("do not include her name");
    expect(hints[3]).toContain("exactly one chapter");
    expect(hints[4]).toContain("at most 1500");
  });
});

describe("messy model output", () => {
  it("recovers the complete object when the model restarts its JSON halfway", () => {
    const whole = { language: "en", title: "A {braced} \"title\"" };
    const restarted = `{"language":"en","title":"half,\n\n${JSON.stringify(whole)}`;
    expect(parseJsonContent(restarted)).toEqual(whole);
    expect(parseJsonContent("```json\n" + JSON.stringify(whole) + "\n```")).toEqual(whole);
    const pretty = JSON.stringify({ ...whole, options: [{ tone: "warm" }] }, null, 2);
    expect(parseJsonContent(`${pretty}\n${pretty}`)).toEqual(JSON.parse(pretty));
    expect(() => parseJsonContent("{\"language\":\"en\",")).toThrow(SyntaxError);
  });

  it("normalizes block shapes without adding content", async () => {
    const f = await setup();
    const q = f.story.chapters[0].blocks.find(b => "quote" in b) as { quote: number };
    const messy = { ...f.story, title_note: "model aside", read: { text: f.story.read }, nextStep: { ...f.story.nextStep, why: { text: f.story.nextStep.why } }, opening: f.story.opening.map(p => ({ p })), chapters: f.story.chapters.map((c, i) => i === 0 ? { ...c, blocks: ["A plain string paragraph about the start.", { quote: String(q.quote), text: "copied text" }, { p: "A paragraph with an empty quote slot.", quote: null }, ...c.blocks] } : c) };
    const { story, repairs } = f.validate(messy);
    expect(story.opening).toEqual(f.story.opening);
    expect(story.read).toBe(f.story.read);
    expect(story.nextStep.why).toBe(f.story.nextStep.why);
    expect(story.chapters[0].blocks.slice(0, 3)).toEqual([{ p: "A plain string paragraph about the start." }, { quote: q.quote }, { p: "A paragraph with an empty quote slot." }]);
    expect(repairs).toEqual(["coerced:shape"]);
  });
});

describe("sample report", () => {
  it("passes the same story rules as a paid report", async () => {
    const { sampleReport } = await import("@/lib/report/sample");
    const report = sampleReport.report!;
    const evidence = sampleReport.evidence!;
    const analysis = { preview: sampleReport.preview, range: sampleReport.preview.range, turningPoints: report.timeline.points.map(p => ({ date: p.date })), youName: "Sophie", last: { H: { id: 16, ts: evidence[15].ts } } };
    const ctx = buildStoryContext(analysis as never, evidence, Date.UTC(2026, 6, 12, 12));
    expect(ctx.today).toBe("July 12");
    const facts = [...report.summary.claims].map((c, i) => ({ id: `f${i + 1}`, text: c.fact, evidenceIds: c.evidenceIds }));
    const { youName: _name, ...modelShape } = report.story!;
    const { story, repairs } = validateStoryWithRepairs(modelShape, ctx, facts, evidence, []);
    expect(repairs).toEqual([]);
    expect(story).toEqual(report.story);
    expect(report.summary.headline).toBe(report.story!.title);
  });
});
