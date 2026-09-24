import { fmtDate } from "@/lib/format";
import type { ReportView } from "./view";
import { maskText, publicTeaser, type TeaserData } from "./teaser";
import type { Claim, FullReport, ReportStory } from "./types";

const date = (month: number, day: number, hour = 0, minute = 0) => Date.UTC(2026, month - 1, day, hour, minute);
const shiftDate = date(5, 18);
const claims: Claim[] = [
  { fact: "He started 54% of conversations before May 18, compared with 22% after.", interpretation: "The drop in initiation suggests less consistent effort, even though his replies remain warm.", confidence: "high", evidenceIds: [3, 7, 9, 10] },
  { fact: "His typical reply time increased from 18 minutes to 2 hours.", interpretation: "Work, stress, or a change in routine could also explain a slower pace.", confidence: "high", evidenceIds: [9, 10, 13, 14] },
  { fact: "Warm messages continued, while concrete plans became less frequent.", interpretation: "Friendly words and reliable follow-through are different signals. It may help to ask about plans directly.", confidence: "medium", evidenceIds: [10, 12, 14, 16] },
];

/** 示例报告的故事正文：与付费报告同一结构，满足同一套校验（见 tests/story.test.ts）。 */
const story: ReportStory = {
  language: "en",
  question: "Has his energy changed?",
  youName: "Sophie",
  title: "The Porch Light on a Timer: Warm When It Comes On, Harder to Find",
  opening: [
    "Sophie, I read your chat twice. The first time I was charmed. The second time I started noticing who was turning the lights on.",
    "In the spring, he was the one flipping the switch: a question about your day, then a restaurant, then a time. After the middle of May the light still comes on, and it is still warm when it does. It just waits for you to reach for it.",
    "It's July 12 as I write this, a week since his last message, a sweet one with no plan attached. My guess is you've read it more than once, trying to work out whether it means he's still in. So let's answer your question with what the chat can actually show.",
  ],
  chapters: [
    {
      id: "c1", span: "April 13 – May 17", emoji: "🕯️", title: "He was the one flipping the switch",
      blocks: [
        { p: "In the spring the pattern is easy to read, because he does the work of reading it for you. He remembers what's happening in your life, and then he turns it into a plan." },
        { quote: 1 }, { quote: 2 }, { quote: 3 },
        { p: "Notice the order: interest first, then a day, then the logistics handled. That is what effort looks like in text. He isn't only warm; he is making something happen." },
        { quote: 5 }, { quote: 6 },
        { p: "And it isn't a one-off. The same shape shows up again in May, right before things shift." },
        { quote: 7 }, { quote: 8 },
        { p: "The wider numbers match what you feel reading it. He started 54% of conversations before May 18, compared with 22% after. In spring, that first half of the chat was his." },
      ],
    },
    {
      id: "c2", span: "May 18 – July 5", emoji: "🌙", title: "The light still works. You have to find the switch.",
      blocks: [
        { p: "Around the middle of May something changes, and it's quieter than you might expect. No argument, no cold shoulder. You start suggesting the plans, and his replies get gentler and vaguer at the same time." },
        { quote: 9 }, { quote: 10 },
        { p: "Maybe soon isn't a no. But it is the first time in this chat that a plan goes to him and doesn't come back with a day attached." },
        { quote: 11 }, { quote: 12 },
        { p: "This is the part that's easy to misread. He's affectionate, and affection feels like an answer. Look closer, though: it's a reply to your check-in, and it still doesn't carry a plan." },
        { quote: 13 }, { quote: 14 }, { quote: 15 }, { quote: 16 },
        { p: "By July the rhythm is clear. You ask, he's warm, the plan stays open. His typical reply time increased from 18 minutes to 2 hours. None of that proves what is going on inside him. It does describe who is carrying the planning right now." },
      ],
    },
  ],
  turn: { text: "It's May 24. You ask him to pick a day, and for the first time the answer is warmth without a date. Everything after follows that shape: kind words, open calendar.", evidenceIds: [9, 10] },
  otherReading: "The kindest honest explanation is that his life got heavier around mid-May: work, family, something he hasn't told you about. His apologies point that way, and I give it real weight. What it doesn't explain is why, across several weeks, he never offers another time on his own.",
  read: "My read leans toward interest that is still there but isn't being turned into plans right now. That's different from losing interest, and the chat can't tell us which way it will go. What you can do is ask for the thing that's missing, clearly and once.",
  yourSide: "You've been doing lovely things: checking in without pressure, asking for plans in plain words, staying kind when the answers were vague. That isn't needy; it's clear. Just notice how much of the reaching you've been doing, and give yourself permission to want it to feel mutual.",
  nextStep: {
    responseGuide: "plans",
    question: "Would you like to pick a day to see each other this week?",
    why: "If you still want to see him, a specific invitation gives him an easy way to help make it happen, and his answer tells you more than another warm text would.",
    howToAsk: "Use words that sound like you. Suggest a day if you have one in mind, then leave room for him to answer.",
    watchFor: "Whether he answers with a real day, and whether that plan actually happens. Warm words without a day are the pattern you already know.",
    messageOptions: [
      { tone: "warm", text: "I miss our dinners. Want to pick an evening this week?" },
      { tone: "direct", text: "I'd love to actually see you. Which day works for you this week?" },
      { tone: "light", text: "The Italian place misses us. Are you free one evening this week?" },
    ],
    avoid: "A long message listing every time he was vague. It tends to put people on the defensive before you learn anything new.",
    plan: "Send one invitation this week. If he names a day, go, and notice whether he suggests the next plan himself. If he stays vague, you can tell him you'd like firmer plans, then decide how much more effort feels right to you.",
  },
  signoff: "Wanting someone to reach for the switch too isn't asking for much. It's asking for enough.",
};
const report: FullReport = {
  story,
  summary: {
    headline: story.title,
    paragraphs: ["Since May 18, he starts fewer conversations and takes longer to reply."],
    claims,
  },
  interest: {
    level: "mixed", trendDeclining: true, note: "His tone is warm, but initiation and planning have become less consistent.",
    dimensions: [
      { key: "initiative", label: "Initiative", level: "low", score: .22, sentence: "He started 22% of conversations after May 18." },
      { key: "curiosity", label: "Curiosity", level: "moderate", score: .45, sentence: "He still asks about your day, although less often." },
      { key: "engagement", label: "Engagement", level: "moderate", score: .6, sentence: "He replies warmly when you reach out." },
      { key: "planning", label: "Planning", level: "low", score: .2, sentence: "Recent plans tend to stay open-ended." },
      { key: "followThrough", label: "Follow-through", level: "low", score: .25, sentence: "The recent conversation does not confirm a new date." },
    ], claims: [claims[2]],
  },
  investment: {
    rows: [
      { key: "initiative", label: "Conversation starts", you: .78, him: .22, format: "pct", higherIsMore: true },
      { key: "reply", label: "Typical reply time", you: 12, him: 120, format: "minutes", higherIsMore: false },
      { key: "plans", label: "Concrete plans", you: 6, him: 2, format: "count", higherIsMore: true },
    ],
    takeaway: "You have been doing more of the reaching out recently.", claims: [claims[0]],
  },
  timeline: {
    points: [{
      id: "sample-shift", date: shiftDate, direction: "cooling", confidence: "high",
      title: "His effort became less consistent after May 18.",
      fact: claims[0].fact, interpretation: claims[0].interpretation!,
      offlineCaveat: "Messages cannot show work, stress, or conversations you had in person.",
      rows: [{ label: "He starts conversations", before: "54%", after: "22%" }, { label: "His typical reply", before: "18 min", after: "2 hr" }],
      evidenceIds: [1, 2, 3, 4, 5, 6],
    }],
    series: [.52, .56, .54, .57, .55, .51, .34, .26, .23, .22, .22, .22].map((value,i) => ({
      weekStart: date(4, 13) + i * 7 * 86400000, himInitShare: value, himReplyMin: i < 5 ? 18 : 120,
      himMsgShare: i < 5 ? .48 : .35, total: 180 + i * 3,
    })),
  },
  mixedSignals: {
    interest: [{ fact: "He continues to use warm, affectionate language.", interpretation: "His tone suggests comfort in the conversation.", confidence: "medium", evidenceIds: [2, 6] }],
    distance: [claims[0], claims[2]],
    combination: "The warmth is there. The consistent effort to make plans is less clear.", breadcrumbing: false,
  },
  nextStep: story.nextStep,
  order: ["summary", "interest", "investment", "timeline", "mixedSignals", "nextStep"],
  meta: { writer: "mock", version: "design-sample-3", generatedAt: date(7, 12) },
};

/** Explicitly fictional fixture, used only by /sample-report. Never returned by the reports API. */
export const sampleReport: ReportView = {
  id: "sample", status: "ready", paid: true, question: "energy_changed", customQuestion: null,
  createdAt: date(7, 5),
  preview: {
    totalMessages: 2486, activeDays: 75, range: [date(4, 13), date(7, 5)], liteMode: false,
    initiation: { you: .78, him: .22 }, medianReply: { you: 12, him: 120 },
    messageShare: { you: .65, him: .35 }, questionRatio: { you: .2, him: .09 },
    headline: {
      date: shiftDate, metric: "initiation", direction: "cooling", sentence: "His energy shifted after May 18.",
      comparison: { initiation: { before: .54, after: .22 }, reply: { before: 18, after: 120 } },
    },
    counts: { turningPoints: 1, mixedSignals: 2, evidence: 16, shifts: 1 },
  },
  report,
  evidence: [
    { id: 1, ts: date(4, 14, 19, 2), sender: "H", text: "How did the pitch go? I've been thinking about you all afternoon." },
    { id: 2, ts: date(4, 14, 19, 10), sender: "Y", text: "It went well! They want a second meeting." },
    { id: 3, ts: date(4, 14, 19, 12), sender: "H", text: "Knew it. Dinner Friday to celebrate? I'll book the Italian place you liked." },
    { id: 4, ts: date(4, 14, 19, 15), sender: "Y", text: "Yes please 😊" },
    { id: 5, ts: date(4, 25, 11, 40), sender: "H", text: "Farmers market tomorrow morning? I'll bring coffee." },
    { id: 6, ts: date(4, 25, 11, 52), sender: "Y", text: "Only if it's oat milk." },
    { id: 7, ts: date(5, 10, 14, 0), sender: "H", text: "Want to grab dinner on Friday? I can book that place you mentioned." },
    { id: 8, ts: date(5, 10, 14, 18), sender: "Y", text: "That sounds lovely. Friday works for me!" },
    { id: 9, ts: date(5, 24, 10, 14), sender: "Y", text: "Want to pick a day this week?" },
    { id: 10, ts: date(5, 24, 13, 47), sender: "H", text: "This week is a lot. Maybe soon?" },
    { id: 11, ts: date(5, 27, 19, 20), sender: "Y", text: "Hope your week is going okay." },
    { id: 12, ts: date(5, 27, 21, 20), sender: "H", text: "Hey you, thanks for checking in. Been thinking about you." },
    { id: 13, ts: date(6, 14, 18, 5), sender: "Y", text: "I miss our Friday dinners. Could we plan one?" },
    { id: 14, ts: date(6, 14, 22, 31), sender: "H", text: "Yeah for sure, let me check my schedule." },
    { id: 15, ts: date(7, 2, 12, 30), sender: "Y", text: "Any luck with your schedule?" },
    { id: 16, ts: date(7, 5, 9, 12), sender: "H", text: "Sorry, crazy few weeks. Miss you though." },
  ],
};

/** 示例预览页的钩子：与真实预览同样的结构，取自上面的示例故事与消息。 */
export const sampleTeaser: TeaserData = {
  status: "ready",
  opening: publicTeaser(
    { ...story, outline: story.chapters.map(({ id, emoji, title }) => ({ id, emoji, title })), firstBlocks: story.chapters[0].blocks },
    { evidence: sampleReport.evidence!, youName: story.youName, liteMode: false, firstSpan: story.chapters[0].span, fmtDate },
  ),
  facts: {
    youName: "Sophie", liteMode: false,
    hisLast: { date: "July 5", daysAgo: "seven days" },
    change: { date: "May 18", before: sampleReport.evidence![6].text, afterMasked: maskText(sampleReport.evidence![9].text) },
    chapters: story.chapters.length,
    messages: sampleReport.evidence!.length,
  },
};
