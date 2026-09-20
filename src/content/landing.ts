/**
 * 落地页（money pages）内容。详见 docs/keyword-research.md §2.1、§4。
 * 一个意图一个页面：每页有自己的直接回答、测量项、样例输出和 FAQ，不做关键词替换式模板。
 * "What we measure" 公开评分规范里的真实阈值——这是相对竞品的信息增量。
 * （只保留 FAQ 内容，不加 FAQPage schema：自 2023 年起该富结果只对政府/健康类网站展示。）
 */

import type { QuestionId } from "@/lib/questions";

export type SampleKind = "shift" | "interest" | "mixed" | "investment" | "breadcrumb" | "comeback" | "stats";

export interface Answer {
  /** 问句式 H2，用于争取精选摘要 / People Also Ask。 */
  q: string;
  /** 开头就是 40–60 词的直接回答。 */
  a: string;
  /** 可选列表（会被摘要直接提取）。 */
  list?: string[];
}

export interface LandingPage {
  slug: string;
  question: QuestionId | null;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  /** H1 下方 2–3 句的直接回答。 */
  lede: string;
  cta: string;
  measures: { name: string; how: string }[];
  sample: SampleKind;
  sampleCaption: string;
  answers: Answer[];
  useCases: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  /** 正文内指向相关页面的链接（描述性锚文本）。 */
  related: { slug: string; text: string }[];
  /** 精简布局：首屏直接上传，正文只留测量项 + FAQ（answers/useCases 不渲染，问答并入 faq）。 */
  simple?: boolean;
}

export const LANDING_UPDATED = "2026-09-18";

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "is-he-losing-interest",
    question: "losing_interest",
    title: "Is He Losing Interest? Check the Texting Pattern, Not One Text",
    description:
      "Upload your WhatsApp chat and see whether his effort actually dropped — and the week it started. Free preview, no signup, and your full chat never leaves your phone.",
    eyebrow: "Is he losing interest?",
    h1: "Is he losing interest? Check the pattern, not one text.",
    lede:
      "One slow reply doesn't mean anything. A real loss of interest shows up as a trend: he starts fewer conversations, asks fewer questions, replies slower and stops making plans — often several at once. We measure all of that across your whole chat and show you the week it changed.",
    cta: "See if his effort changed",
    measures: [
      { name: "Who starts conversations", how: "A new conversation begins after 6+ hours of silence. We track his share of those starts week by week." },
      { name: "Typical reply time", how: "The median time between your message and his reply, within the same conversation — not overnight gaps." },
      { name: "Questions he asks", how: "The share of his messages that ask you something. Curiosity is one of the first things to fade." },
      { name: "Concrete plans", how: "Messages that propose an activity with a time (“dinner Friday at 7?”), separate from vague “we should hang out sometime”." },
      { name: "When it changed", how: "We compare four weeks before and after every week in your chat and flag the point where several of these move together." },
    ],
    sample: "shift",
    sampleCaption: "Sample from a full report — the turning point card.",
    answers: [
      {
        q: "What are the signs he's losing interest over text?",
        a: "The most reliable signs are changes, not single messages: he initiates less often, his replies get slower and shorter, he asks fewer questions about your life, and concrete plans turn vague or disappear. One of these alone is usually noise. Several moving together over two or more weeks is a pattern worth taking seriously.",
        list: [
          "He starts noticeably fewer conversations than he used to",
          "His typical reply time stretches from minutes to hours",
          "His questions about you drop off",
          "Plans go from specific (“Friday at 7”) to vague (“sometime”)",
          "More one-word replies: “ok”, “lol”, “nice”",
        ],
      },
      {
        q: "How long before a change in texting means something?",
        a: "Give it at least two to three weeks. Texting naturally dips during busy weeks, travel or stress. That's why our analysis needs three or more weeks of history before it will flag a turning point — and why it compares four-week windows, not single days.",
      },
    ],
    useCases: [
      { title: "“He used to text me good morning.”", body: "See exactly when his initiation dropped, and whether you quietly took over starting every conversation." },
      { title: "After a few great dates", body: "Check whether his effort changed after you met — or whether it was steady and you're reading into a busy week." },
      { title: "Before you bring it up", body: "Walk into the conversation with specifics instead of “you seem different lately.”" },
    ],
    faq: [
      { q: "Can this tell me if he's lost feelings?", a: "No — and nothing can from texts alone. We measure observable texting behavior. When his effort drops, the report says so and shows the evidence, but it also reminds you that work, stress or things said in person can explain a change." },
      { q: "What if he's just a bad texter?", a: "That's exactly why we look at change over time instead of absolute numbers. A consistently slow texter looks steady. A man whose own pattern shifts looks different — we compare him to himself." },
      { q: "Do you read my messages?", a: "Your chat is analyzed on your device. Only statistics and up to 120 example messages — with names, emails and numbers removed — are sent to create your report, and those examples are deleted after 30 days." },
      { q: "When do I see the price?", a: "After you read your free preview. If you want the full report, you'll see the price before checkout. It is one payment, with no subscription." },
    ],
    related: [
      { slug: "mixed-signals-text-analyzer", text: "check whether his signals are mixed rather than fading" },
      { slug: "does-he-like-me-text-analyzer", text: "see how interested his texting looks overall" },
    ],
  },
  {
    slug: "does-he-like-me-text-analyzer",
    simple: true,
    question: "likes_me",
    title: "Does He Like Me? Text Analyzer for Your Full Chat",
    description:
      "Find out what his texting actually shows: who initiates, how curious he is, whether he makes plans. Analyze your whole WhatsApp chat — free preview, private by default.",
    eyebrow: "Does he like me?",
    h1: "Does he like me? Let his texts answer.",
    lede: "Add your WhatsApp chat. We count how often he reaches out, asks about you and makes plans — then rate his interest.",
    cta: "Analyze his interest",
    measures: [
      { name: "Initiative", how: "His share of conversation starts in recent weeks. Around 40–50% is typical of mutual interest." },
      { name: "Curiosity", how: "How often his messages ask you something, compared with how often yours do." },
      { name: "Engagement", how: "His reply speed and message length relative to yours, plus his share of the conversation." },
      { name: "Planning", how: "Specific plans he proposes — a day, a time, an activity." },
      { name: "Follow-through", how: "Whether his plans hold, or get cancelled and pushed within a week." },
    ],
    sample: "interest",
    sampleCaption: "Sample from a full report — the interest breakdown.",
    answers: [],
    useCases: [],
    faq: [
      {
        q: "How can you tell if a guy likes you over text?",
        a: "Look for effort that costs him something: he texts first without a reason, asks follow-up questions and suggests specific plans — a day, a time, something to do. Fast replies and emojis are weaker signals. What counts most is that the effort stays consistent week to week.",
      },
      { q: "Will it tell me if he loves me?", a: "No. We don't guess feelings or give a “love score.” We rate observable interest — strong, moderate, mixed or low — and show the behavior behind it." },
      {
        q: "Why not just ask ChatGPT about a screenshot?",
        a: "A screenshot shows a moment. Whether he likes you is a pattern across weeks — who reaches out, whether plans happen. We count that across your whole chat.",
      },
      { q: "What do I need?", a: "A WhatsApp chat export (.txt or .zip) with at least 50 messages. To see when things changed, a few weeks and a few hundred messages work best." },
      { q: "Is my chat uploaded?", a: "Your full chat is read on your device. For your report we keep statistics and up to 120 anonymized example messages, and delete the examples after 30 days." },
      { q: "Is it free?", a: "The preview, including who starts conversations, reply times and the biggest change we found, is free. If you want the full report, you'll see the price before checkout." },
    ],
    related: [
      { slug: "is-he-losing-interest", text: "check whether his interest is fading" },
      { slug: "situationship-analyzer", text: "analyze a situationship that won't define itself" },
    ],
  },
  {
    slug: "mixed-signals-text-analyzer",
    simple: true,
    question: "mixed_signals",
    title: "Mixed Signals Text Analyzer — Where His Words and Actions Differ",
    description:
      "Hot and cold? Analyze your chat to see where his warmth and his follow-through don't match. Free preview of your full WhatsApp history.",
    eyebrow: "Mixed signals",
    h1: "Mixed signals? See where his words and actions split.",
    lede: "Add your WhatsApp chat. We check for warm texts with no plans, fast replies with no effort, and disappear-and-return cycles.",
    cta: "Decode the mixed signals",
    measures: [
      { name: "Warmth without plans", how: "He sends affectionate messages at least as often as you do, but proposed one or no concrete plans recently." },
      { name: "Responsive but passive", how: "He replies within 30 minutes but starts 25% or fewer of your conversations." },
      { name: "Disappear and return", how: "At least twice: he goes quiet for 3+ days, then comes back with a longer-than-usual conversation." },
      { name: "Vague plans only", how: "Three or more “we should…” ideas and zero specific ones." },
      { name: "Late-night pattern", how: "Half or more of the conversations he starts begin between 10pm and 3am." },
    ],
    sample: "mixed",
    sampleCaption: "Sample from a full report — both columns of the mixed signals check.",
    answers: [],
    useCases: [],
    faq: [
      {
        q: "What counts as mixed signals from a guy?",
        a: "His words suggest interest but his actions don't match — or his attention comes and goes. Flirty texts with no real plans, quick replies but he never reaches out first, or disappearing for days and returning as if nothing happened.",
      },
      {
        q: "Should I trust his words or his actions?",
        a: "When they disagree for several weeks, actions are usually the more reliable signal — especially plans that actually happen. Words are cheap; reaching out first and following through take effort.",
      },
      { q: "What if nothing is mixed?", a: "Then the report says so. Consistent signals — in either direction — are a clear answer too." },
      { q: "Is this a red flag detector?", a: "No. We don't label him or diagnose anything. We show where his behavior points in two directions." },
      { q: "Is my chat uploaded?", a: "Your full chat is read on your device. For your report we keep statistics and up to 120 anonymized example messages, and delete the examples after 30 days." },
      { q: "Is it free?", a: "The preview is free. If you want the full report with both columns and the messages behind them, you'll see the price before checkout." },
    ],
    related: [
      { slug: "breadcrumbing-test", text: "take the breadcrumbing test" },
      { slug: "is-he-losing-interest", text: "see if his effort is dropping over time" },
    ],
  },
  {
    slug: "situationship-analyzer",
    question: "situationship",
    title: "Situationship Analyzer — Is This Going Anywhere?",
    description:
      "Analyze your situationship texts: who invests more, whether he makes real plans, and how his effort changed. Free preview of your whole WhatsApp chat.",
    eyebrow: "Situationship analyzer",
    h1: "Is this situationship going anywhere? Check what his texting shows.",
    lede:
      "A situationship lives in the gap between attention and commitment. You can't read his intentions from texts — but you can see whether his effort is growing, flat or fading, whether his plans are specific and whether they happen. That's what this analysis measures.",
    cta: "Analyze our situationship",
    measures: [
      { name: "Investment balance", how: "Who starts conversations, asks questions, suggests plans and checks in — you vs him, side by side." },
      { name: "Plans vs vague plans", how: "Specific invitations with a day or time, versus “we should…” that never lands." },
      { name: "Follow-through", how: "How many of his concrete plans were cancelled or pushed within a week." },
      { name: "Direction of effort", how: "Whether his effort has been rising, steady or falling over the life of your chat." },
    ],
    sample: "investment",
    sampleCaption: "Sample from a full report — who is more invested.",
    answers: [
      {
        q: "How do you know if a situationship is going nowhere?",
        a: "The clearest sign is that nothing is building: plans stay vague or last-minute, effort doesn't grow as time passes, and you're doing most of the reaching out. Months of steady-but-flat attention without concrete plans usually means the current setup is what he wants — and it's fair to ask directly.",
      },
      {
        q: "Can texting show whether he wants a relationship?",
        a: "Not directly — texting shows effort, not intentions. But effort is informative: rising initiative and specific plans suggest investment, while flat or falling effort suggests the connection isn't a priority. The only way to learn intentions is to ask, and the report helps you decide what to ask.",
      },
    ],
    useCases: [
      { title: "“What are we?”", body: "Before you ask, see whether his behavior has been building or flat." },
      { title: "You always reach out", body: "Get the actual numbers on who carries the conversation." },
      { title: "He comes back when you pull away", body: "See whether his effort rises only when yours drops." },
    ],
    faq: [
      { q: "Will it tell me to leave?", a: "No. We never tell you to stay or go. We show the pattern and suggest one question worth asking him directly." },
      { q: "Does it work for long chats?", a: "Yes — the longer the history, the better. We handle up to 200,000 messages, and a few months of chat gives the clearest timeline." },
      { q: "When do I see the price?", a: "After your free preview. If you want to keep reading, you'll see the one-time price before checkout." },
    ],
    related: [
      { slug: "mixed-signals-text-analyzer", text: "check his texts for mixed signals" },
      { slug: "does-he-like-me-text-analyzer", text: "see how interested his behavior looks" },
    ],
  },
  {
    slug: "breadcrumbing-test",
    question: "mixed_signals",
    title: "Breadcrumbing Test — Check His Texts for the Pattern",
    description:
      "Is he breadcrumbing you? Test your WhatsApp chat for the pattern: attention that comes and goes, flirting without plans, vague promises. Free preview.",
    eyebrow: "Breadcrumbing test",
    h1: "Breadcrumbing test: check your chat for the pattern.",
    lede:
      "Breadcrumbing is intermittent attention without follow-through — just enough to keep you around, never enough to move forward. We flag it only when two measurable patterns appear together: he disappears and returns, and his warmth isn't matched by concrete plans.",
    cta: "Run the breadcrumbing test",
    measures: [
      { name: "Disappear-and-return cycles", how: "Two or more times he went quiet for 3+ days, then came back with a longer-than-usual conversation." },
      { name: "Flirting without plans", how: "His affectionate messages keep up with yours while concrete plans stay at one or none." },
      { name: "Vague promises", how: "Three or more “we should…” plans with nothing specific." },
      { name: "Who restarts things", how: "Who breaks each long silence — and whether it's always him, on his schedule." },
    ],
    sample: "breadcrumb",
    sampleCaption: "Sample from a full report — a breadcrumbing-consistent pattern.",
    answers: [
      {
        q: "What does breadcrumbing look like over text?",
        a: "Breadcrumbing looks like sporadic, low-effort attention that keeps hope alive without progress: a flirty text after days of silence, “we should hang out” without a date, likes and replies that never become plans. The defining feature is the cycle — attention, disappearance, return — repeating without anything moving forward.",
        list: [
          "Silences of several days, then sudden attention",
          "Flirting that never turns into a specific plan",
          "“We should…” instead of “Are you free Thursday?”",
          "He restarts the conversation on his timing",
        ],
      },
      {
        q: "Is it breadcrumbing or is he just busy?",
        a: "Busy people are usually consistent: slower overall, but plans still happen. Breadcrumbing is inconsistent — bursts of attention followed by gaps, with warmth that doesn't lead anywhere. Looking at months of history instead of one week is how you tell them apart.",
      },
    ],
    useCases: [
      { title: "He always comes back", body: "See how many times the disappear-return cycle actually happened." },
      { title: "Flirty but never available", body: "Count his warm messages against his real invitations." },
      { title: "You want to be sure", body: "We only use the word when two patterns appear together — not on a hunch." },
    ],
    faq: [
      { q: "Will you say he's definitely breadcrumbing?", a: "No. When both patterns appear, the report says the behavior is “consistent with breadcrumbing” and shows the evidence. We describe patterns, not intentions." },
      { q: "What if only one pattern shows up?", a: "Then it's listed as a mixed signal on its own, without the breadcrumbing label." },
      { q: "Is my chat private?", a: "Yes. The full chat is analyzed on your device; only statistics and a small set of anonymized examples are used for your report." },
    ],
    related: [
      { slug: "mixed-signals-text-analyzer", text: "see all the mixed signals in your chat" },
      { slug: "ex-text-analyzer", text: "analyze why an ex came back" },
    ],
  },
  {
    slug: "ex-text-analyzer",
    question: "ex_came_back",
    title: "Ex Text Analyzer — Why Did He Come Back?",
    description:
      "Your ex texted again. Analyze your whole chat history to see when he pulled away before, and whether his effort now looks different. Free preview.",
    eyebrow: "Ex text analyzer",
    h1: "Why did your ex text you? See what the history shows.",
    lede:
      "When an ex comes back, the useful question isn't what one message means — it's whether anything is different this time. We map your entire chat: when his effort dropped before, what that looked like, and how his behavior since he returned compares.",
    cta: "Analyze the chat with my ex",
    measures: [
      { name: "The first pullback", how: "The turning point where his effort dropped the first time, with before and after numbers." },
      { name: "The return", how: "When his effort rose again, and which behaviors moved — initiation, questions, plans." },
      { name: "Effort now vs before", how: "His current initiative, curiosity and planning compared with the best stretch of your history." },
      { name: "Plans vs words", how: "Whether the comeback includes specific plans, or mostly warm words." },
    ],
    sample: "comeback",
    sampleCaption: "Sample from a full report — a return after a cooling period.",
    answers: [
      {
        q: "Why does my ex keep texting me?",
        a: "Common reasons include loneliness, habit, genuine regret or wanting to keep an option open — and texts alone can't tell you which. What texts can show is whether his behavior is different from before: does he make specific plans and follow through, or does the attention fade on the same timeline as last time?",
      },
      {
        q: "How can I tell if my ex is serious this time?",
        a: "Compare his effort now to the stretch before the breakup, not to the silence right after it. Consistency over several weeks, specific plans that happen, and him initiating — not just responding — are the signs that something changed. A burst of warm texts on its own isn't.",
      },
    ],
    useCases: [
      { title: "“Did I miss the signs?”", body: "See exactly when his effort started dropping the first time." },
      { title: "He's back and saying the right things", body: "Check whether his behavior matches his words this time." },
      { title: "Deciding whether to reply", body: "Get the pattern before you get pulled back into the rhythm." },
    ],
    faq: [
      { q: "Does it say whether I should get back together?", a: "No. We never tell you to stay or go. We show what the history shows and suggest one question worth asking him." },
      { q: "What if the chat is years long?", a: "That's ideal — we handle up to 200,000 messages and a long history shows the clearest turning points." },
      { q: "Is it free?", a: "The preview is free. If you want to unlock the full report, you'll see the one-time price before checkout." },
    ],
    related: [
      { slug: "breadcrumbing-test", text: "check whether the comeback fits a breadcrumbing pattern" },
      { slug: "is-he-losing-interest", text: "see how a loss of interest shows up in texts" },
    ],
  },
  {
    slug: "whatsapp-relationship-analyzer",
    question: null,
    title: "WhatsApp Relationship Analyzer — Private Chat Report",
    description:
      "Analyze your WhatsApp chat with him: who texts first, reply times, and the week things changed. Runs in your browser — your full chat is never uploaded.",
    eyebrow: "WhatsApp relationship analyzer",
    h1: "WhatsApp relationship analyzer for the chat with him.",
    lede:
      "Export your WhatsApp chat and get a private report on your texting dynamic: who initiates, who replies faster, who asks and who plans — and the week his behavior changed. Your chat is read in your browser; the full conversation is never uploaded.",
    cta: "Analyze my WhatsApp chat",
    measures: [
      { name: "Who texts first", how: "Conversation starts after 6+ hours of silence, split between you and him." },
      { name: "Reply times", how: "Median, 75th and 90th percentile reply times for each of you." },
      { name: "Effort balance", how: "Questions, plans, apologies and check-ins, you vs him." },
      { name: "Weekly trend", how: "His initiation, reply speed and message share, week by week." },
      { name: "Turning points", how: "Up to five weeks where his behavior clearly shifted, with before-and-after numbers." },
    ],
    sample: "stats",
    sampleCaption: "Sample from a free preview — generated from your chat in seconds.",
    answers: [
      {
        q: "How do I export a WhatsApp chat to analyze?",
        a: "On iPhone, open the chat, tap his name, scroll down and tap Export Chat, then choose Without Media. On Android, open the chat, tap ⋮ → More → Export chat → Without media. Save the file and upload it here — .txt and .zip both work.",
        list: [
          "iPhone: chat → his name → Export Chat → Without Media",
          "Android: chat → ⋮ → More → Export chat → Without media",
          "Upload the .txt or .zip file",
        ],
      },
      {
        q: "Is it safe to upload my WhatsApp chat?",
        a: "Here, your full chat never leaves your device: parsing and analysis run in your browser. To build the report we send statistics and up to 120 example messages with names, emails, phone numbers and links replaced. Those examples are deleted after 30 days, and you can delete everything at any time.",
      },
    ],
    useCases: [
      { title: "Who carries the conversation?", body: "Settle it with numbers instead of vibes." },
      { title: "Something changed", body: "Find the week his texting shifted, and what moved." },
      { title: "Years of history", body: "Handles chats up to 200,000 messages." },
    ],
    faq: [
      { q: "Does it work with group chats?", a: "Yes — pick the two people you want to compare and we'll ignore the rest." },
      { q: "What about iMessage?", a: "Not yet. WhatsApp exports and pasted text are supported today." },
      { q: "Which date formats work?", a: "US and international formats, 12- or 24-hour time, from both iPhone and Android exports. If dates are ambiguous, we'll ask you." },
    ],
    related: [
      { slug: "is-he-losing-interest", text: "find out if he's losing interest" },
      { slug: "does-he-like-me-text-analyzer", text: "see how much he likes you, by the numbers" },
    ],
  },
];

export function getLanding(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
