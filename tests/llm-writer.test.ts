import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeRoleMsgs } from "@/lib/analysis";
import { buildUpload } from "@/lib/report/payload";
import { MockReportWriter } from "@/lib/report/mock-writer";
import { explainIssues, measuredFacts, ReportValidationError, validateNarrative, validateNarrativeWithRepairs } from "@/lib/report/narrative";
import { deepseekProvider, DeepSeekReportWriter, glmProvider, LlmReportWriter, reportPrompt, teaserPrompt } from "@/lib/server/llm-writer";
import { freeFinding, PURCHASE_FOCUS } from "@/lib/report/presentation";
import { QUESTION_IDS } from "@/lib/questions";
import type { ReportInput } from "@/lib/report/writer";
import type { ReportStory } from "@/lib/report/types";
import { narrativeFixture } from "./narrative-fixture";
import { storyFixture } from "./story-fixture";
import { buildStoryContext } from "@/lib/report/story";
import { genChat } from "./synth";

async function setup(lite = false, seed = 5) {
  const upload = buildUpload(analyzeRoleMsgs(genChat({ weeks: 12, coolAtWeek: 7, seed }), lite), { question: "custom", customQuestion: "他是不是在敷衍我？", youName: "Emma", himName: "Jake" });
  const input: ReportInput = { reportId: "test-report", question: "custom", customQuestion: upload.customQuestion!, analysis: upload.analysis, evidence: upload.evidence };
  const { report, allowed } = await new MockReportWriter().write(input);
  const facts = measuredFacts(report);
  const narrative = narrativeFixture(facts[0]);
  const story = storyFixture(buildStoryContext(input.analysis, input.evidence, Date.now()), input.evidence);
  return { input, report, allowed, facts, narrative, story, validate: (value: unknown) => validateNarrative(value, report, facts, new Set(input.evidence.map(e => e.id)), allowed) };
}
const completion = (value: unknown, finish = "stop") => new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(value) } }] }));

afterEach(() => vi.useRealTimers());
// 样例故事很短：这些测试只看流程，不查篇幅（篇幅另有测试）
const NO_LENGTH = { checkLength: false };

describe("English grounded report contract", () => {
  it("accepts direct evidence-led English without forcing a hedge into each interpretation", async () => {
    const f = await setup();
    expect(f.validate(f.narrative)).toEqual(f.narrative);
  });

  it.each(["他对你的投入正在减少，但我们无法判断原因。", "La conversación muestra cambios importantes en la manera de comunicarse. No podemos saber lo que siente esta persona ni comprender todo lo que sucede fuera de estos mensajes."])("rejects non-English output: %s", async answer => {
    const f = await setup();
    expect(() => f.validate({ ...f.narrative, answer })).toThrow();
  });

  it("rejects forged facts, unknown evidence, ungrounded observations and extra fields", async () => {
    const f = await setup();
    // A forged number on a known measured fact is restored to the measured text, never kept.
    expect(f.validate({ ...f.narrative, supporting: [{ ...f.narrative.supporting[0], fact: "He started 99% of conversations." }] }).supporting[0].fact).toBe(f.facts[0].text);
    for (const replacement of [
      { factId: "missing-fact" },
      { evidenceIds: [999999999] },
      { factId: null, fact: "He seems distant in the conversation.", evidenceIds: [] },
    ]) expect(() => f.validate({ ...f.narrative, supporting: [{ ...f.narrative.supporting[0], ...replacement }] })).toThrow();
    expect(() => f.validate({ ...f.narrative, investment: { rows: [] } })).toThrow();
    expect(() => f.validate({ ...f.narrative, nextStep: { ...f.narrative.nextStep, watchFor: "He is definitely cheating. Leave him." } })).toThrow();
  });

  it("tolerates a long opening answer but rejects runaway text with an actionable issue", async () => {
    const f = await setup();
    const sentence = "The pattern in this chat is steady and gives you something concrete to talk about together. ";
    expect(() => f.validate({ ...f.narrative, answer: sentence.repeat(11).trim() })).not.toThrow();
    expect(() => f.validate({ ...f.narrative, answer: sentence.repeat(20).trim() })).toThrow(expect.objectContaining({ issues: ["schema:answer:too_big:1500"] }));
  });

  it("drops a single non-compliant observation instead of failing the whole report", async () => {
    const f = await setup();
    const good = f.narrative.supporting[0];
    const second = { ...good, interpretation: "The same pattern shows up across the later part of this chat as well." };
    const bad = { ...good, factId: null, fact: "He agreed to a call at 8.", evidenceIds: [] };
    const { narrative, repairs } = validateNarrativeWithRepairs({ ...f.narrative, supporting: [good, second], counterEvidence: [bad] }, f.report, f.facts, new Set(f.input.evidence.map(e => e.id)), f.allowed);
    expect(narrative.supporting).toEqual([good, second]);
    expect(narrative.counterEvidence).toEqual([]);
    expect(repairs).toEqual(["dropped:claim:2"]);
  });

  it("never repairs by dropping below the minimum support or around prose problems", async () => {
    const f = await setup();
    const good = f.narrative.supporting[0];
    const bad = { ...good, factId: null, fact: "He agreed to a call at 8.", evidenceIds: [] };
    expect(() => f.validate({ ...f.narrative, supporting: [good, bad] })).toThrow(ReportValidationError);
    expect(() => f.validate({ ...f.narrative, counterEvidence: [bad], answer: `${f.narrative.answer} He replied within 5 minutes.` })).toThrow(ReportValidationError);
  });

  it("explains each failed rule in words the model can act on", () => {
    const hints = explainIssues(["claim:4:cite_message_or_measured_fact", "number:summary.paragraphs[2]", "schema:answer:too_big:1500"], 3);
    expect(hints[0]).toContain("counterEvidence[1]");
    expect(hints[0]).toContain("must cite at least one evidenceId");
    expect(hints[1]).toMatch(/^answer: contains a number/);
    expect(hints[2]).toContain("at most 1500");
  });

  it("accepts valid references across ten synthetic chats and lite mode", async () => {
    for (let seed = 1; seed <= 10; seed++) {
      const f = await setup(seed % 2 === 0, seed);
      expect(() => f.validate(f.narrative), `seed ${seed}`).not.toThrow();
    }
  });
});

describe("DeepSeek report writer", () => {
  it("uses DeepSeek JSON output, passes custom questions as data, and locks charts and statistics", async () => {
    const f = await setup();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(f.story));
    const result = await new DeepSeekReportWriter("test-only-key", "deepseek-flash", request, NO_LENGTH).write(f.input);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.messages[0].content).toContain("English only");
    expect(body.messages[0].content).not.toContain(f.input.customQuestion!);
    expect(body.messages[1].content).toContain(f.input.customQuestion!);
    expect(body.messages[1].content).not.toContain(f.input.reportId);
    expect(result.report.investment.rows).toEqual(f.report.investment.rows);
    expect(result.report.timeline).toEqual(f.report.timeline);
    expect(result.report.story).toEqual({ ...f.story, youName: "Emma" });
    expect(result.report.summary.headline).toBe(f.story.title);
    expect(result.report.nextStep).toEqual(f.story.nextStep);
    expect(result.report.meta.writer).toBe("llm");
  });

  it("corrects an invalid language response once, then succeeds", async () => {
    const f = await setup();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion({ ...f.story, read: "这段聊天不能证明对方的感受，需要进一步沟通。" })).mockResolvedValueOnce(completion(f.story));
    const result = await new DeepSeekReportWriter("test-only", undefined, request, NO_LENGTH).write(f.input);
    expect(request).toHaveBeenCalledTimes(2);
    expect(String(request.mock.calls[1][1]?.body)).toContain("Write every field in English only.");
    expect(result.report.meta.writer).toBe("llm");
  });

  it.each(["malformed", "truncated", "server", "empty"])("fails closed after two %s responses", async failure => {
    const f = await setup();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => failure === "server" ? new Response("private provider error", { status: 503 }) : failure === "malformed" ? new Response("not json") : failure === "empty" ? completion(null) : completion(f.story, "length"));
    await expect(new DeepSeekReportWriter("test-only", undefined, request, NO_LENGTH).write(f.input)).rejects.toThrow("Report model request failed");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rejected API key or call the provider with a missing key", async () => {
    const f = await setup();
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    await expect(new DeepSeekReportWriter("", undefined, request, NO_LENGTH).write(f.input)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    await expect(new DeepSeekReportWriter("bad-test-key", undefined, request, NO_LENGTH).write(f.input)).rejects.toMatchObject({ reasons: ["deepseek:1:http:401"] });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("bounds requests that hang, retries once, and aborts each attempt", async () => {
    const f = await setup();
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    const pending = new DeepSeekReportWriter("test-only", undefined, request, NO_LENGTH).write(f.input);
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(361_000);
    await assertion;
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("keeps instructions for counterevidence, positive outcomes and lite-mode limitations", () => {
    const base = { thematic: false, lite: false, routine: false };
    const p = reportPrompt(base);
    expect(p).toContain("strongest honest non-dramatic explanation");
    expect(p).toContain("stable, positive chat gets a warm, stable story");
    expect(p).toContain("never her name");
    expect(p).not.toContain("liteMode");
    expect(reportPrompt({ ...base, lite: true })).toContain("liteMode: there are no timestamps");
  });

  it("only includes the rules that apply to this chat", () => {
    const base = { thematic: false, lite: false, routine: false };
    expect(reportPrompt(base)).not.toContain("THEMES");
    expect(reportPrompt({ ...base, thematic: true })).toContain("THEMES");
    expect(reportPrompt(base)).not.toContain("storyFacts.recurring");
    expect(reportPrompt({ ...base, routine: true })).toContain("a script in which little new gets said");
    expect(reportPrompt(base)).not.toContain("fixedOpening");
    expect(reportPrompt({ ...base, fixed: "firstChapter" })).toContain("chapterHeads");
    // 最容易被忽略的判断类要求放在最前面
    const p = reportPrompt({ ...base, routine: true });
    expect(p.indexOf("WHAT MATTERS MOST")).toBeLessThan(p.indexOf("THE SHAPE"));
    expect(p).toContain("never\n   call it a first");
    expect(teaserPrompt(base)).toContain("Do not state or\n  paraphrase her question");
  });
});

describe("Model fallback chain (order as configured)", () => {
  const GLM_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  const DS_URL = "https://api.deepseek.com/chat/completions";
  const writer = (request: typeof fetch, glmKey = "glm-test", dsKey = "ds-test") =>
    new LlmReportWriter([glmProvider(glmKey), deepseekProvider(dsKey)], request, Date.now, NO_LENGTH);

  it("calls GLM-5.3 on the domestic endpoint with low reasoning, and accepts fenced JSON", async () => {
    const f = await setup();
    const fenced = new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "```json\n" + JSON.stringify(f.story) + "\n```" } }] }));
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(fenced);
    const result = await writer(request).write(f.input);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(GLM_URL);
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.model).toBe("glm-5.3");
    expect(body.reasoning_effort).toBe("low");
    expect(body.thinking).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(result.report.meta).toMatchObject({ model: "glm-5.3", version: "glm-en-3" });
  });

  it("falls back to DeepSeek after GLM fails validation twice", async () => {
    const f = await setup();
    const bad = { ...f.story, read: "这段聊天不能证明对方的感受，需要进一步沟通。" };
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(bad)).mockResolvedValueOnce(completion(bad)).mockResolvedValueOnce(completion(f.story));
    const result = await writer(request).write(f.input);
    expect(request.mock.calls.map(c => c[0])).toEqual([GLM_URL, GLM_URL, DS_URL]);
    expect(String(request.mock.calls[1][1]?.body)).toContain("Write every field in English only.");
    expect(String(request.mock.calls[2][1]?.body)).not.toContain("previous attempt");
    expect(result.report.meta).toMatchObject({ model: "deepseek-v4-pro", version: "deepseek-en-3" });
    expect(result.failures).toEqual(["glm:1:validation:language:english_required", "glm:2:validation:language:english_required"]);
  });

  it.each(["rejected key", "content filter"])("switches to DeepSeek at once on a GLM %s", async label => {
    const f = await setup();
    const glmResponse = label === "rejected key" ? new Response("unauthorized", { status: 401 }) : completion({}, "sensitive");
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(glmResponse).mockResolvedValueOnce(completion(f.story));
    await writer(request).write(f.input);
    expect(request.mock.calls.map(c => c[0])).toEqual([GLM_URL, DS_URL]);
  });

  it("skips GLM when its key is missing and records reasons from every model", async () => {
    const f = await setup();
    const ok = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(f.story));
    await writer(ok, "").write(f.input);
    expect(ok.mock.calls.map(c => c[0])).toEqual([DS_URL]);
    const down = vi.fn<typeof fetch>().mockImplementation(async () => new Response("unavailable", { status: 503 }));
    await expect(writer(down).write(f.input)).rejects.toMatchObject({ reasons: ["glm:1:http:503", "glm:2:http:503", "deepseek:1:http:503", "deepseek:2:http:503"] });
  });

  it("keeps time for DeepSeek when GLM hangs", async () => {
    const f = await setup();
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
      if (url === DS_URL) return completion(f.story);
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    });
    const pending = writer(request).write(f.input);
    await vi.advanceTimersByTimeAsync(181_000);
    const result = await pending;
    // GLM 一次就用满 180 秒，剩下的时间留给 DeepSeek，不再重试 GLM
    expect(request.mock.calls.map(c => c[0])).toEqual([GLM_URL, DS_URL]);
    expect(result.report.meta.model).toBe("deepseek-v4-pro");
  });
});

describe("Free preview and question-specific purchase", () => {
  it("gives a complete measured finding when there is no detected change", async () => {
    const f = await setup();
    const preview = { ...f.input.analysis.preview, headline: null, initiation: { you: 0.75, him: 0.25 } };
    expect(freeFinding(preview).context).toContain("75%");
    expect(freeFinding(preview).title).toContain("You");
    expect(freeFinding({ ...preview, liteMode: true }).context).toContain("Without timestamps");
    for (const question of QUESTION_IDS) expect(PURCHASE_FOCUS[question].length).toBeGreaterThan(40);
  });
});

describe("Free preview opening", () => {
  const teaserFor = (story: ReportStory) => ({
    language: "en", title: "The Long Porch Light: Steady Signals and Quiet Stretches",
    opening: ["Emma, I read your chat slowly, the way you read something that matters to a friend.", "What I found looks less like a mystery and more like a porch light. Let me show you where it changed."],
    chapters: story.chapters.map(({ id, emoji, title }) => ({ id, emoji, title: `${title}, first look` })),
    firstChapter: { blocks: story.chapters[0].blocks },
  });

  it("writes the opening and first chapter with its own prompt and output cap", async () => {
    const f = await setup();
    const out = teaserFor(f.story);
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(out));
    const { teaser } = await new DeepSeekReportWriter("test-only", undefined, request).writeTeaser(f.input);
    expect(teaser).toMatchObject({ title: out.title, opening: out.opening, outline: out.chapters, firstBlocks: out.firstChapter.blocks, model: "deepseek-v4-pro" });
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("THE SHAPE (the first part of her report");
    expect(body.max_tokens).toBe(4000);
  });

  it("puts back everything she already read in the paid report", async () => {
    const f = await setup();
    const out = teaserFor(f.story);
    const fixed = { title: out.title, opening: out.opening, outline: out.chapters, firstBlocks: out.firstChapter.blocks, model: "deepseek-flash", generatedAt: 1 };
    const input = { ...f.input, analysis: { ...f.input.analysis, teaser: fixed } };
    // 模型按提示把开头和第一章留空，服务器填回
    const blank = { ...f.story, opening: [], chapters: f.story.chapters.map((c, i) => i === 0 ? { ...c, blocks: [] } : c) };
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(blank));
    const result = await new DeepSeekReportWriter("test-only", undefined, request, NO_LENGTH).write(input);
    expect(String(request.mock.calls[0][1]?.body)).toContain("firstChapterBlocks");
    expect(result.report.story).toMatchObject({ title: fixed.title, opening: fixed.opening });
    expect(result.report.story!.chapters.map(c => c.title)).toEqual(out.chapters.map(c => c.title));
    expect(result.report.story!.chapters[0].blocks).toEqual(fixed.firstBlocks);
    expect(result.report.summary.headline).toBe(fixed.title);
  });

  it("still keeps an early title and opening that came without chapters", async () => {
    const f = await setup();
    const out = teaserFor(f.story);
    const fixed = { title: out.title, opening: out.opening, model: "deepseek-flash", generatedAt: 1 };
    const input = { ...f.input, analysis: { ...f.input.analysis, teaser: fixed } };
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(f.story));
    const result = await new DeepSeekReportWriter("test-only", undefined, request, NO_LENGTH).write(input);
    expect(result.report.story).toMatchObject({ title: fixed.title, opening: fixed.opening });
    expect(result.report.story!.chapters).toEqual(f.story.chapters);
  });
});

describe("Model timeouts", () => {
  it("gives flagship models more time per attempt than flash models", () => {
    expect(deepseekProvider("k", "deepseek-flash").timeoutMs).toBe(60_000);
    expect(deepseekProvider("k").timeoutMs).toBe(180_000);
    expect(deepseekProvider("k", "deepseek-v4-pro").timeoutMs).toBe(180_000);
    expect(glmProvider("k", "glm-5.3-flashx").timeoutMs).toBe(90_000);
    expect(glmProvider("k").timeoutMs).toBe(180_000);
  });
});

describe("Report length", () => {
  it("asks once for a longer story, then accepts the rewrite even if it is still short", async () => {
    const f = await setup();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(f.story)).mockResolvedValueOnce(completion(f.story));
    const result = await new DeepSeekReportWriter("test-only", undefined, request).write(f.input);
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.failures?.[0]).toMatch(/^deepseek:1:validation:length:\d+:1800:2600$/);
    const retry = JSON.parse(String(request.mock.calls[1][1]?.body));
    expect(retry.messages[0].content).toContain("words of prose; write 1800 to 2600");
  });

  it.each([["a broken rewrite", () => completion({ chapters: [] })], ["a failed request", () => new Response("down", { status: 503 })]])("keeps the short first draft after %s instead of failing the paid report", async (_label, second) => {
    const f = await setup();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(completion(f.story)).mockResolvedValueOnce(second());
    const result = await new DeepSeekReportWriter("test-only", undefined, request).write(f.input);
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.report.story!.chapters.length).toBe(f.story.chapters.length);
    expect(result.failures?.at(-1)).toBe("deepseek:kept:first_draft");
  });

  it("gives long chats a longer target and more quotes per chapter", () => {
    const base = { thematic: true, lite: false, routine: false };
    expect(reportPrompt(base)).toContain("1800 to 2600 words of prose");
    expect(reportPrompt({ ...base, long: true })).toContain("2500 to 3500 words of prose");
    expect(reportPrompt({ ...base, long: true })).toContain("five to nine quotes each");
  });
});
