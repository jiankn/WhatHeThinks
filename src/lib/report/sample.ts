import type { ReportView } from "./view";
import type { Claim, FullReport } from "./types";

const date = (month: number, day: number, hour = 0, minute = 0) => Date.UTC(2026, month - 1, day, hour, minute);
const shiftDate = date(5, 18);
const claims: Claim[] = [
  { fact: "He started 54% of conversations before May 18, compared with 22% after.", interpretation: "The drop in initiation suggests less consistent effort, even though his replies remain warm.", confidence: "high", evidenceIds: [1, 2, 3, 4] },
  { fact: "His typical reply time increased from 18 minutes to 2 hours.", interpretation: "Work, stress, or a change in routine could also explain a slower pace.", confidence: "high", evidenceIds: [3, 4] },
  { fact: "Warm messages continued, while concrete plans became less frequent.", interpretation: "Friendly words and reliable follow-through are different signals. It may help to ask about plans directly.", confidence: "medium", evidenceIds: [2, 4, 5, 6] },
];
const report: FullReport = {
  summary: {
    headline: "His replies stayed warm. His effort became less consistent.",
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
  nextStep: {
    responseGuide: "plans",
    question: "Would you like to pick a day to see each other this week?",
    why: "If you still want to see him, a specific invitation gives him a chance to help make it happen.",
    howToAsk: "Use words that sound like you. Suggest a day if you have one in mind, then leave room for him to answer.",
  },
  order: ["summary", "interest", "investment", "timeline", "mixedSignals", "nextStep"],
  meta: { writer: "mock", version: "design-sample-1", generatedAt: date(7, 5) },
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
    counts: { turningPoints: 1, mixedSignals: 2, evidence: 6, shifts: 1 },
  },
  report,
  evidence: [
    { id: 1, ts: date(5, 10, 14, 0), sender: "H", text: "Want to grab dinner on Friday? I can book that place you mentioned." },
    { id: 2, ts: date(5, 10, 14, 18), sender: "Y", text: "That sounds lovely. Friday works for me!" },
    { id: 3, ts: date(5, 24, 10, 14), sender: "Y", text: "Want to pick a day this week?" },
    { id: 4, ts: date(5, 24, 13, 47), sender: "H", text: "This week is a lot. Maybe soon?" },
    { id: 5, ts: date(5, 27, 19, 20), sender: "Y", text: "Hope your week is going okay." },
    { id: 6, ts: date(5, 27, 21, 20), sender: "H", text: "Hey you, thanks for checking in. Been thinking about you." },
  ],
};
