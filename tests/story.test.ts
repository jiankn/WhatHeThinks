import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze, analyzeRoleMsgs, parseAny } from "@/lib/analysis";
import { buildUpload, firstName, validateUpload } from "@/lib/report/payload";
import { MockReportWriter } from "@/lib/report/mock-writer";
import { measuredFacts, ReportValidationError } from "@/lib/report/narrative";
import { buildStoryContext, buildTeaserFacts, chapterOf, explainStoryIssues, maskText, numberWord, publicTeaser, stripMarkdown, validateStoryWithRepairs, validateTeaser } from "@/lib/report/story";
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
  ])("removes a sentence with %s and keeps the rest of the paragraph", async (_label, text, issue) => {
    const f = await setup();
    const kept = "This part of the paragraph is fine and should stay.";
    const input = withBlock(f.story, `${kept} ${text}`);
    const at = input.chapters[0].blocks.length - 1;
    const { story, repairs } = f.validate(input);
    expect(story.chapters[0].blocks[at]).toEqual({ p: kept });
    expect(repairs).toContain(`removed:sentence:chapters[0].blocks[${at}]`);
    // 同一句话放在删不掉的单句字段里，仍然让整份报告失败，并给出同样的规则编号
    expect(() => f.validate({ ...f.story, turn: { ...f.story.turn, text } })).toThrow(expect.objectContaining({ issues: [expect.stringContaining(issue.replace("chapters[0]", "turn"))] }));
  });

  it("drops a paragraph block or message option that is entirely non-compliant", async () => {
    const f = await setup();
    const { story, repairs } = f.validate(withBlock(f.story, "He went quiet for 37 days in a row."));
    expect(story.chapters[0].blocks).toEqual(f.story.chapters[0].blocks);
    expect(repairs.some(r => r.startsWith("removed:sentence:chapters[0]"))).toBe(true);
    const options = [...f.story.nextStep.messageOptions.slice(0, 2), { tone: "light" as const, text: "He definitely misses you, trust me." }];
    const out = f.validate({ ...f.story, nextStep: { ...f.story.nextStep, messageOptions: options } });
    expect(out.story.nextStep.messageOptions).toEqual(f.story.nextStep.messageOptions.slice(0, 2));
  });

  it("keeps digits, names and foreign language out of the shareable parts", async () => {
    const f = await setup();
    expect(() => f.validate({ ...f.story, title: "Emma and the Porch Light: A Summer Story" })).toThrow(expect.objectContaining({ issues: ["name:title"] }));
    expect(() => f.validate({ ...f.story, title: "The Friday at 7 Club: A Summer Story" })).toThrow(expect.objectContaining({ issues: ["digits:title"] }));
    expect(() => f.validate({ ...f.story, nextStep: { ...f.story.nextStep, question: "Are you free at 11:45 tonight?" } })).toThrow(ReportValidationError);
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
    expect(parseJsonContent('{"blocks": [{"p": "one",\n  {"p": "two"}, {"quote": 3}]}')).toEqual({ blocks: [{ p: "one" }, { p: "two" }, { quote: 3 }] });
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

describe("free preview hook", () => {
  const opening = ["Emma, I read your chat slowly, the way you read something that matters to a friend.", "What I found looks less like a mystery and more like a porch light: steady for a long time, then easier to miss. Let me show you where the light changed, and what it looked like from your side of the door."];

  it("accepts an honest title and opening, and rejects the same failures as a report", async () => {
    const f = await setup();
    const ok = { language: "en", title: "The Long Porch Light: Steady Signals and Quiet Stretches", opening };
    expect(validateTeaser(ok, f.ctx, f.facts, f.upload.evidence, f.allowed).teaser).toEqual({ title: ok.title, opening });
    expect(validateTeaser({ ...ok, title_note: "x", opening: opening.map(p => ({ p })) }, f.ctx, f.facts, f.upload.evidence, f.allowed).repairs).toEqual(["coerced:shape"]);
    expect(() => validateTeaser({ ...ok, title: "Emma and the Porch Light: A Story" }, f.ctx, f.facts, f.upload.evidence, f.allowed)).toThrow(expect.objectContaining({ issues: ["name:title"] }));
    expect(() => validateTeaser({ ...ok, opening: [opening[0], "He went quiet for 37 days. Leans toward: he wants the comfort of you without the effort."] }, f.ctx, f.facts, f.upload.evidence, f.allowed)).toThrow(expect.objectContaining({ issues: ["number:opening[1]", "banned:opening[1]"] }));
    expect(() => validateTeaser({ ...ok, opening: [opening[0]] }, f.ctx, f.facts, f.upload.evidence, f.allowed)).toThrow(ReportValidationError);
  });

  it("shows the first paragraph and only the start of the second", () => {
    const t = publicTeaser({ title: "T", opening });
    expect(t.first).toBe(opening[0]);
    expect(t.next.split(" ").length).toBe(24);
    expect(t.next.endsWith("…")).toBe(true);
    expect(opening[1].startsWith(t.next.slice(0, -1))).toBe(true);
  });

  it("masks everything but the first word", () => {
    expect(maskText("hey, miss you")).toBe("hey, •••• •••");
    expect(maskText("yeah")).toBe("yeah");
    expect(maskText("I'd rather talk 🙂")).toBe("I'd •••••• •••• 🙂");
  });

  it("builds real locked findings from the fictional export, with his words masked", () => {
    const raw = readFileSync("reports/test-data/WhatsApp-Emily-Jake-fictional.txt", "utf8");
    const up = buildUpload(analyze(parseAny(raw, { forceDateOrder: "MDY" }), "Emily", "Jake"), { question: "overview", youName: "Emily", himName: "Jake" });
    const facts = buildTeaserFacts(up.analysis, up.evidence, NOW);
    expect(facts).toMatchObject({ youName: "Emily", hisLast: { date: "September 12", daysAgo: "twelve days" }, chapters: 2, liteMode: false });
    expect(facts.change?.date).toBe("August 2");
    expect(facts.change?.before).toBeTruthy();
    expect(facts.change?.afterMasked).toMatch(/•/);
    expect(facts.repeated?.weeks).toMatch(/^(three|four|five|six|seven|eight|nine|ten)/);
    expect(facts.repeated?.masked).toMatch(/^\S+ .*•/);
    expect(facts.messages).toBe(up.evidence.length);
  });

  it("gives lite mode no dates or change", async () => {
    const f = await setup(true);
    const facts = buildTeaserFacts(f.upload.analysis, f.upload.evidence, NOW);
    expect(facts.hisLast).toBeUndefined();
    expect(facts.change).toBeUndefined();
    expect(facts.chapters).toBe(1);
  });
});

describe("single-chapter chats", () => {
  it("rejects a story that splits storyFacts' one chapter into two", async () => {
    const f = await setup(true); // lite mode: always exactly one chapter
    const split = { ...f.story, chapters: [f.story.chapters[0], { ...f.story.chapters[0], title: "Later on" }] };
    expect(() => f.validate(split)).toThrow(expect.objectContaining({ issues: expect.arrayContaining(["chapters:count"]) }));
  });
});

describe("markdown emphasis", () => {
  it("strips *word*, **word** and _word_ but leaves other text alone", () => {
    expect(stripMarkdown("Not because it's boring, but because it's *reliable*.")).toBe("Not because it's boring, but because it's reliable.");
    expect(stripMarkdown("This is **the** moment, and _that_ matters.")).toBe("This is the moment, and that matters.");
    expect(stripMarkdown("5 * 3 and snake_case_name stay; [you] stays.")).toBe("5 * 3 and snake_case_name stay; [you] stays.");
  });

  it("cleans the teaser, the page excerpt and the story before checks", async () => {
    const f = await setup();
    const t = validateTeaser({ language: "en", title: "The *Long* Porch Light: Steady Signals", opening: ["Emma, it is *reliable* in the best way, and I want to show you why.", "Let me show you where it changed and what it looked like from your side."] }, f.ctx, f.facts, f.upload.evidence, f.allowed);
    expect(t.teaser.title).toBe("The Long Porch Light: Steady Signals");
    expect(t.repairs).toContain("stripped:markdown");
    expect(publicTeaser({ title: "A *b*", opening: ["one *two*", "three **four**"] })).toEqual({ title: "A b", first: "one two", next: "three four" });
    const { story, repairs } = f.validate(withBlock(f.story, "It was *steady*, and that matters."));
    expect(JSON.stringify(story)).not.toContain("*");
    expect(repairs).toContain("stripped:markdown");
  });
});

describe("paid report rule fixes from a live failure", () => {
  it("allows a time already agreed in the messages in the suggested message", async () => {
    const f = await setup();
    const time = f.upload.evidence.map(e => e.text.match(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i)?.[0]).find(Boolean);
    if (!time) return;
    const { story } = f.validate({ ...f.story, nextStep: { ...f.story.nextStep, question: `Still on for ${time}? I have been looking forward to it.` } });
    expect(story.nextStep.question).toContain(time);
  });
});
