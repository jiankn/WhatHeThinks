import type { EvidenceMsg } from "@/lib/analysis/analysis-types";
import { fitsChapter, type StoryContext } from "@/lib/report/story";
import type { ReportStory, StoryBlock } from "@/lib/report/types";

/** Fictional model output for contract and rendering tests; not evidence of live model quality. youName is added by the server. */
export function storyFixture(ctx: StoryContext, evidence: EvidenceMsg[]): ReportStory {
  // 每章引用本章可用、全篇尚未引用过的消息，凑够全篇至少 8 条；反复出现的原话放在最前面
  const used = new Set<number>();
  const recurring = new Set(ctx.recurring.flatMap(r => r.evidenceIds));
  const perChapter = Math.max(3, Math.ceil(8 / ctx.chapters.length));
  const chapters = ctx.chapters.map(c => {
    const fits = evidence.filter(e => fitsChapter(ctx, e.ts, c.id) && !used.has(e.id)).sort((a, b) => Number(recurring.has(b.id)) - Number(recurring.has(a.id)));
    const quotes = fits.slice(0, perChapter);
    for (const q of quotes) used.add(q.id);
    const blocks: StoryBlock[] = [{ p: "This stretch of the chat has its own rhythm, and it is worth looking at closely before deciding what it means." }];
    for (const q of quotes) blocks.push({ quote: q.id }, { p: "Notice how this message sits next to the ones around it rather than on its own." });
    return { id: c.id, span: c.span, emoji: "🌿", title: "A rhythm worth reading slowly", blocks };
  });
  return {
    language: "en",
    question: "What does the way we talk show about our connection?",
    title: "The Long Porch Light: Steady Signals and Quiet Stretches",
    opening: [
      `${ctx.youName ? `${ctx.youName}, ` : ""}I read your chat slowly, the way you read something that matters to a friend.`,
      "What I found looks less like a mystery and more like a porch light: steady for a long time, then easier to miss.",
    ],
    chapters,
    turn: { text: "The moment that matters most is the point where the plans stopped arriving on their own.", evidenceIds: evidence.slice(0, 2).map(e => e.id) },
    otherReading: "The kindest honest explanation is a genuinely busy stretch. I give it real weight, because the early warmth looks unforced.",
    read: "My read leans toward effort that has thinned out rather than warmth that has vanished, though I cannot see inside his head.",
    yourSide: "You kept showing up with warmth and clear questions. Wanting plans that actually land is a reasonable thing to want.",
    nextStep: {
      question: "I have missed spending proper time together. Would you like to pick an evening this week?",
      why: "It asks for something concrete without asking him to defend a motive the messages cannot show.",
      howToAsk: "Send it once, at a relaxed moment, and give him room to answer.",
      watchFor: "Whether he names a real day, and whether the plan happens.",
      responseGuide: "plans",
      messageOptions: [
        { tone: "warm", text: "I really like our talks. Want to find an evening to catch up properly?" },
        { tone: "direct", text: "I would like us to make an actual plan. Which evening works for you?" },
        { tone: "light", text: "My calendar has a suspiciously empty evening. Interested?" },
      ],
      avoid: "Avoid a long message listing everything you have noticed; it tends to put people on the defensive.",
      plan: "Send one message this week. If he names a day, go and see whether the effort continues. If he stays vague after that, decide how much more effort feels right to you.",
    },
    signoff: "Whatever you decide, you were never too much for wanting a plan.",
  };
}
