/**
 * MockReportWriter：用确定性模板生成 6 模块报告（MVP）。
 * 规则见 docs/prompt-architecture.md §4。所有数字经 FactBook 登记，供 Claim Checker 校验。
 * 同一份报告永远得到同样的措辞；不同报告按 reportId 哈希选择模板变体。
 */

import type { InterestLevel, TurningPoint } from "@/lib/analysis/analysis-types";
import type { QuestionId } from "@/lib/questions";
import { FactBook } from "./factbook";
import type {
  BeforeAfterRow,
  Claim,
  Dim,
  FullReport,
  InvestRow,
  ModuleKey,
  SeriesPoint,
  TPNarrative,
} from "./types";
import { lastValidWeeks, type WindowAgg } from "./window";
import { buildHighlights } from "./highlights";
import type { ReportInput, ReportWriter } from "./writer";

export const MOCK_VERSION = "mock-2";
const DAY_MS = 24 * 60 * 60 * 1000;

// ── 文案常量 ─────────────────────────────────────────────────

const OFFLINE_CAVEAT =
  "Texts don't show everything — work, stress, or things said in person could also explain a change like this.";

const LEVEL_PHRASE: Record<InterestLevel, string> = {
  strong: "strong observable interest",
  moderate: "moderate observable interest",
  mixed: "mixed observable interest",
  low: "low observable interest",
};

const LEVEL_NOTE: Record<InterestLevel, string> = {
  strong: "Across recent weeks, most of his observable behavior points toward active interest.",
  moderate: "He's showing interest in some clear ways, with a few areas where his effort is lighter.",
  mixed: "Some of his behavior points toward interest and some doesn't — that split is itself the pattern.",
  low: "Most of his observable effort signals are on the low side right now.",
};

const DIM_LABEL: Record<Dim["key"], string> = {
  initiative: "Initiative",
  curiosity: "Curiosity",
  engagement: "Engagement",
  planning: "Planning",
  followThrough: "Follow-through",
};

/** 转折点 driver 的展示名与格式。 */
const DRIVER: Record<string, { row: string; phrase: string; kind: "pct" | "min" | "rate" }> = {
  initShare: { row: "Conversations he started", phrase: "share of conversation starts", kind: "pct" },
  replyP50Log: { row: "His typical reply time", phrase: "typical reply time", kind: "min" },
  questionRatio: { row: "His messages with a question", phrase: "rate of asking questions", kind: "pct" },
  msgShare: { row: "His share of all messages", phrase: "share of the messages", kind: "pct" },
  plansPerWeek: { row: "Concrete plans he suggested", phrase: "concrete plans", kind: "rate" },
  warmthRate: { row: "His messages that are affectionate", phrase: "rate of affectionate messages", kind: "pct" },
  dryRate: { row: "His replies that are one word", phrase: "rate of one-word replies", kind: "pct" },
};

const ORDER: Record<QuestionId, ModuleKey[]> = {
  overview: ["summary", "interest", "timeline", "investment", "mixedSignals", "nextStep"],
  likes_me: ["summary", "interest", "investment", "timeline", "mixedSignals", "nextStep"],
  losing_interest: ["summary", "timeline", "interest", "investment", "mixedSignals", "nextStep"],
  energy_changed: ["summary", "timeline", "interest", "investment", "mixedSignals", "nextStep"],
  mixed_signals: ["summary", "mixedSignals", "interest", "investment", "timeline", "nextStep"],
  more_invested: ["summary", "investment", "interest", "timeline", "mixedSignals", "nextStep"],
  situationship: ["summary", "interest", "mixedSignals", "investment", "timeline", "nextStep"],
  ex_came_back: ["summary", "timeline", "interest", "investment", "mixedSignals", "nextStep"],
  custom: ["summary", "interest", "investment", "timeline", "mixedSignals", "nextStep"],
};

// ── 工具 ─────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function share(a: number, b: number): number {
  return a + b > 0 ? a / (a + b) : 0.5;
}

// ── 生成器 ───────────────────────────────────────────────────

export class MockReportWriter implements ReportWriter {
  readonly name = "mock" as const;

  async write(input: ReportInput): Promise<{ report: FullReport; allowed: string[] }> {
    return new Composer(input).compose();
  }
}

class Composer {
  private readonly fb = new FactBook();
  private readonly a: ReportInput["analysis"];
  private readonly lite: boolean;
  private readonly recent: WindowAgg; // 最近 6 个有效周
  private readonly evidenceIds: Set<number>;
  private readonly seed: number;

  constructor(private readonly input: ReportInput) {
    this.a = input.analysis;
    this.lite = input.analysis.preview.liteMode;
    this.recent = lastValidWeeks(this.a.weeks, 6, this.a.range[1]);
    this.evidenceIds = new Set(input.evidence.map((e) => e.id));
    this.seed = hash(input.reportId);
  }

  private pick<T>(variants: T[], salt = 0): T {
    return variants[(this.seed + salt) % variants.length];
  }

  /** 只保留仍在证据集里的 id（证据可能已过期或被截断）。 */
  private ev(ids: number[] | undefined, n = 5): number[] {
    return (ids ?? []).filter((id) => this.evidenceIds.has(id)).slice(0, n);
  }

  /** 转折点证据：变化前后各取 n 条（最靠近转折点的），让对比一目了然。 */
  private balancedEv(ids: number[], date: number, n = 3): number[] {
    const ts = new Map(this.input.evidence.map((e) => [e.id, e.ts]));
    const valid = ids.filter((id) => ts.has(id)).sort((x, y) => ts.get(x)! - ts.get(y)!);
    const before = valid.filter((id) => ts.get(id)! < date).slice(-n);
    const after = valid.filter((id) => ts.get(id)! >= date).slice(0, n);
    return [...before, ...after];
  }

  /** 从证据里挑他发的、以问号结尾的消息。 */
  private hisQuestions(n: number): number[] {
    return this.input.evidence
      .filter((e) => e.sender === "H" && e.text.trim().endsWith("?"))
      .slice(0, n)
      .map((e) => e.id);
  }

  compose(): { report: FullReport; allowed: string[] } {
    const headlineTP = this.headlineTP();
    const interest = this.interestModule();
    const investment = this.investmentModule();
    const timeline = this.timelineModule();
    const mixedSignals = this.mixedModule();
    const summary = this.summaryModule(headlineTP, investment.youEffort);
    const nextStep = this.nextStepModule(headlineTP);

    const report: FullReport = {
      summary,
      interest,
      investment: { rows: investment.rows, takeaway: investment.takeaway, claims: investment.claims },
      timeline,
      mixedSignals,
      nextStep,
      highlights: buildHighlights(this.a, this.input.evidence, timeline.points),
      order: ORDER[this.input.question],
      meta: { writer: "mock", version: MOCK_VERSION, generatedAt: Date.now() },
    };
    return { report, allowed: this.fb.list() };
  }

  private headlineTP(): TurningPoint | null {
    const strong = this.a.turningPoints.filter((t) => t.confidence !== "low");
    if (!strong.length) return null;
    const cooling = strong.filter((t) => t.direction === "cooling");
    const pool = cooling.length ? cooling : strong;
    return pool.reduce((b, t) => (Math.abs(t.shift) > Math.abs(b.shift) ? t : b));
  }

  private fmtDriver(metric: string, v: number): string {
    const d = DRIVER[metric];
    if (!d) return this.fb.pct(v);
    if (d.kind === "min") return this.fb.minutes(v);
    if (d.kind === "rate") return this.fb.weekly(v);
    return this.fb.pct(v);
  }

  // ── M2 Interest ──

  private interestModule(): FullReport["interest"] {
    const { level, trendDeclining, dimensions } = this.a.interest;
    const r = this.recent;
    const H = this.lite ? null : r.H;
    const t = this.a.totals;

    const dims: Dim[] = dimensions.map((d) => {
      const lv: Dim["level"] = d.label;
      let sentence = "";
      switch (d.key) {
        case "initiative":
          sentence = this.lite
            ? `He sent ${this.fb.pct(share(t.H.msgCount, t.Y.msgCount))} of the messages in what you pasted.`
            : r.hInitShare === null
              ? "There weren't enough separate conversations recently to measure who starts them."
              : `He started ${this.fb.pct(r.hInitShare)} of your conversations in recent weeks.`;
          break;
        case "curiosity":
          sentence = `${this.fb.pct(H ? r.hQuestionRatio : t.H.questionRatio)} of his messages ask you something (yours: ${this.fb.pct(H ? r.yQuestionRatio : t.Y.questionRatio)}).`;
          break;
        case "engagement":
          sentence = H
            ? `Lately, his typical reply time is ${this.fb.minutes(H.replyP50)} (yours: ${this.fb.minutes(r.Y.replyP50)}), and his messages average ${this.fb.chars(H.avgLen)} vs your ${this.fb.chars(r.Y.avgLen)}.`
            : `His messages average ${this.fb.chars(t.H.avgLen)} vs your ${this.fb.chars(t.Y.avgLen)}.`;
          break;
        case "planning":
          sentence = H
            ? `He suggested ${this.fb.count(H.plansConcrete, "concrete plan", "concrete plans")} in the last ${this.fb.count(r.weeks, "active week", "active weeks")}.`
            : `He suggested ${this.fb.count(t.H.plansConcrete, "concrete plan", "concrete plans")} in this chat.`;
          break;
        case "followThrough":
          sentence =
            d.score === null
              ? "He hasn't suggested enough concrete plans yet to judge follow-through."
              : d.score >= 1
                ? "None of his concrete plans were cancelled or pushed within a week."
                : d.score <= 0
                  ? "All of his concrete plans were cancelled or pushed within a week."
                  : `${this.fb.pct(1 - d.score)} of his concrete plans were cancelled or pushed within a week.`;
          break;
      }
      return { key: d.key, label: DIM_LABEL[d.key], level: lv, score: d.score, sentence };
    });

    const claims: Claim[] = [];
    const planning = dims.find((d) => d.key === "planning");
    if (planning && planning.level !== "insufficient") {
      claims.push({
        fact: planning.sentence,
        interpretation:
          planning.level === "high"
            ? "Suggesting specific plans is often one of the more reliable signs of interest, because it takes effort."
            : "Few concrete plans can mean he's less focused on seeing you — or that plans get made in person.",
        confidence: "medium",
        evidenceIds: this.ev(this.a.totals.H.hits?.planConcrete, 4),
      });
    }
    const curiosity = dims.find((d) => d.key === "curiosity");
    if (curiosity) {
      claims.push({
        fact: curiosity.sentence,
        interpretation:
          curiosity.level === "high"
            ? "Asking questions suggests he's curious about your life, not just responding."
            : "A low question rate can mean he's engaging less actively, though some people simply text in statements.",
        confidence: "medium",
        evidenceIds: this.hisQuestions(3),
      });
    }

    let note = LEVEL_NOTE[level];
    if (trendDeclining) note += " His effort has also been declining in the last couple of months.";
    return { level, trendDeclining, dimensions: dims, note, claims };
  }

  // ── M3 Investment ──

  private investmentModule(): { rows: InvestRow[]; takeaway: string; claims: Claim[]; youEffort: number } {
    const { Y, H } = this.a.totals;
    const rows: InvestRow[] = [];
    if (!this.lite) {
      rows.push({ key: "initiations", label: "Conversations started", you: Y.initiations, him: H.initiations, format: "count", higherIsMore: true });
    }
    rows.push(
      { key: "messages", label: "Messages sent", you: Y.msgCount, him: H.msgCount, format: "count", higherIsMore: true },
      { key: "questions", label: "Questions asked", you: Y.questions, him: H.questions, format: "count", higherIsMore: true },
      { key: "plans", label: "Concrete plans suggested", you: Y.plansConcrete, him: H.plansConcrete, format: "count", higherIsMore: true },
      { key: "repair", label: "Apologies & repair", you: Y.apology, him: H.apology, format: "count", higherIsMore: true },
      { key: "support", label: "Checking in & support", you: Y.support, him: H.support, format: "count", higherIsMore: true },
      { key: "length", label: "Average message length", you: Y.avgLen, him: H.avgLen, format: "chars", higherIsMore: true },
    );
    if (!this.lite) {
      rows.push({ key: "reply", label: "Typical reply time", you: Y.replyP50, him: H.replyP50, format: "minutes", higherIsMore: false });
    }

    // 投入综合：她的加权平均占比（只算有数据的项）。发起最能代表投入，计划样本少、波动大，权重最低。
    const parts: [number | null, number][] = [
      [!this.lite && Y.initiations + H.initiations > 0 ? share(Y.initiations, H.initiations) : null, 0.4],
      [Y.questions + H.questions > 0 ? share(Y.questions, H.questions) : null, 0.25],
      [share(Y.msgCount, H.msgCount), 0.2],
      [Y.plansConcrete + H.plansConcrete > 0 ? share(Y.plansConcrete, H.plansConcrete) : null, 0.15],
    ];
    const used = parts.filter((p): p is [number, number] => p[0] !== null);
    const youEffort = used.reduce((a, [v, w]) => a + v * w, 0) / used.reduce((a, [, w]) => a + w, 0);

    let takeaway: string;
    if (youEffort >= 0.625) takeaway = "Most of the effort in this chat is coming from you.";
    else if (youEffort >= 0.55) takeaway = "You're carrying a bit more of the conversation than he is.";
    else if (youEffort > 0.45) takeaway = "The effort in this chat is fairly balanced.";
    else takeaway = "He's carrying more of the conversation than you are.";

    const claims: Claim[] = [];
    if (!this.lite) {
      const yInit = share(Y.initiations, H.initiations);
      claims.push({
        fact: `You started ${this.fb.pct(yInit)} of your conversations; he started ${this.fb.pct(1 - yInit)}.`,
        interpretation:
          yInit >= 0.6
            ? "When one person does most of the reaching out, it can mean the other is more passive — or more comfortable waiting to be contacted."
            : "Conversation starts look fairly shared, which suggests neither of you is doing all the reaching out.",
        confidence: "high",
        evidenceIds: [],
      });
    }
    const yQ = share(Y.questions, H.questions);
    if (Y.questions + H.questions > 0) {
      claims.push({
        fact: `You asked ${this.fb.count(Y.questions, "question", "questions")}; he asked ${this.fb.count(H.questions, "question", "questions")}.`,
        interpretation:
          yQ >= 0.6
            ? "You may be doing more of the work of keeping the conversation going."
            : "Questions flow both ways, which suggests mutual curiosity.",
        confidence: "medium",
        evidenceIds: [],
      });
    }
    return { rows, takeaway, claims, youEffort };
  }

  // ── M4 Timeline ──

  private tpNarrative(tp: TurningPoint): TPNarrative {
    const date = this.fb.date(tp.date);
    const top = tp.drivers[0];
    const cooling = tp.direction === "cooling";
    const rows: BeforeAfterRow[] = tp.drivers.map((d) => ({
      label: DRIVER[d.metric]?.row ?? d.metric,
      before: this.fmtDriver(d.metric, d.before),
      after: this.fmtDriver(d.metric, d.after),
    }));
    const moved = tp.drivers.filter((d) => Math.abs(d.d) >= 0.8).length;

    let contextNote: string | undefined;
    const { yInitShareBefore: yb, yInitShareAfter: ya } = tp.context;
    if (cooling && ya - yb >= 0.1) {
      contextNote = `Around the same time, your share of conversation starts rose from ${this.fb.pct(yb)} to ${this.fb.pct(ya)} — you picked up more of the effort.`;
    }
    let conflictNote: string | undefined;
    if (tp.conflictDate) {
      const cd = this.fb.date(tp.conflictDate);
      conflictNote = tp.shiftBeforeConflict
        ? `This shift started before the first tense exchange we found (around ${cd}).`
        : `It came after a tense exchange around ${cd}.`;
    }

    return {
      id: tp.id,
      date: tp.date,
      direction: tp.direction,
      confidence: tp.confidence,
      title: cooling ? `His effort dropped around ${date}` : `His effort picked up around ${date}`,
      fact: top
        ? `Around ${date}, his ${DRIVER[top.metric]?.phrase ?? top.metric} went from ${this.fmtDriver(top.metric, top.before)} to ${this.fmtDriver(top.metric, top.after)}.`
        : `His texting pattern changed around ${date}.`,
      interpretation: cooling
        ? moved >= 2
          ? "Several behaviors dropping at once may indicate reduced engagement on his side, rather than one busy week."
          : "A drop like this may indicate reduced engagement, though a single metric moving can also reflect a change in routine."
        : "An increase like this may reflect renewed interest, or simply more time and availability.",
      offlineCaveat: OFFLINE_CAVEAT,
      rows,
      contextNote,
      conflictNote,
      evidenceIds: this.balancedEv(tp.evidenceIds, tp.date),
    };
  }

  private timelineModule(): FullReport["timeline"] {
    const points = [...this.a.turningPoints].sort((x, y) => x.date - y.date).map((tp) => this.tpNarrative(tp));
    const series: SeriesPoint[] = this.a.weeks
      .filter((w) => !w.sparse)
      .map((w) => {
        const inits = w.H.initiations + w.Y.initiations;
        const msgs = w.H.msgCount + w.Y.msgCount;
        return {
          weekStart: w.weekStart,
          himInitShare: inits ? w.H.initiations / inits : null,
          himReplyMin: w.H.replyP50 > 0 ? w.H.replyP50 : null,
          himMsgShare: msgs ? w.H.msgCount / msgs : 0,
          total: w.total,
        };
      });

    let emptyNote: string | undefined;
    if (this.lite) {
      emptyNote = "Your paste didn't include timestamps, so we can't build a timeline. Upload a WhatsApp export to see when things changed.";
    } else if (!this.a.enoughForTurningPoints) {
      emptyNote = `Your chat covers ${this.fb.count(Math.round((this.a.range[1] - this.a.range[0]) / DAY_MS) + 1, "day", "days")}. We need at least ${this.fb.constant("3 weeks")} of history before we can reliably spot a turning point.`;
    } else if (!points.length) {
      emptyNote = `No sharp changes: his pattern has been fairly consistent across ${this.fb.count(series.length, "active week", "active weeks")}.`;
    }
    return { points, series, emptyNote };
  }

  // ── M5 Mixed signals ──

  private mixedModule(): FullReport["mixedSignals"] {
    // 与兴趣模块同一窗口，避免两处计数看起来矛盾
    const W = this.recent;
    const H = W.H;
    const EIGHT = this.fb.count(W.weeks, "active week", "active weeks");
    const interest: Claim[] = [];
    const distance: Claim[] = [];

    for (const hit of this.a.mixedSignals) {
      const ids = this.ev(hit.evidenceIds, 4);
      let c: Omit<Claim, "evidenceIds" | "confidence"> | null = null;
      switch (hit.id) {
        case "flirt_no_plans":
          c = {
            fact: `In the last ${EIGHT} he sent ${this.fb.count(H.affection, "affectionate message", "affectionate messages")} but suggested ${this.fb.count(H.plansConcrete, "concrete plan", "concrete plans")}.`,
            interpretation: "Warmth without plans can mean he enjoys the connection but isn't prioritizing seeing you — or that plans happen offline.",
          };
          break;
        case "replies_never_initiates":
          c = {
            fact: `He replies in a typical ${this.fb.minutes(H.replyP50)}, but started only ${this.fb.pct(W.hInitShare ?? 0)} of conversations in the last ${EIGHT}.`,
            interpretation: "Quick replies with little initiation often suggest he's responsive but not the one driving things.",
          };
          break;
        case "disappear_return":
          c = {
            fact: `More than once recently, he went quiet for ${this.fb.constant("3+ days")} and then came back with a longer-than-usual conversation.`,
            interpretation: "This on-and-off rhythm can keep things feeling uncertain, whether or not it's intentional.",
          };
          break;
        case "words_vs_followthrough":
          c = {
            fact: `He sent ${this.fb.count(H.affection, "affectionate message", "affectionate messages")} in the last ${EIGHT}, alongside ${this.fb.count(H.plansCancel, "cancelled or postponed plan", "cancelled or postponed plans")}.`,
            interpretation: "When warm words outpace follow-through, the follow-through may be the more reliable signal.",
          };
          break;
        case "vague_plans":
          c = {
            fact: `He floated ${this.fb.count(H.plansVague, "vague plan", "vague plans")} (“we should…”) and no concrete ones in the last ${EIGHT}.`,
            interpretation: "Vague plans can signal interest in the idea of you more than in actually making time.",
          };
          break;
        case "late_night_only":
          c = {
            fact: `Most of the conversations he started recently began between ${this.fb.constant("10pm")} and ${this.fb.constant("3am")}.`,
            interpretation: "Mostly late-night contact can reflect his schedule, but it may also suggest the connection is lower-priority during the day.",
          };
          break;
        case "busy_pattern":
          c = {
            fact: `He mentioned being busy or tired ${this.fb.count(H.busyExcuse, "time", "times")} in the last ${EIGHT}, while his share of conversation starts fell.`,
            interpretation: "Busy stretches are real, but a repeated pattern alongside less initiation may indicate lower priority.",
          };
          break;
        case "warm_words":
          c = {
            fact: `He sent ${this.fb.count(H.affection, "affectionate message", "affectionate messages")} in the last ${EIGHT}.`,
            interpretation: "Affectionate language is often a sign of genuine warmth.",
          };
          break;
        case "makes_plans":
          c = {
            fact: `He suggested ${this.fb.count(H.plansConcrete, "concrete plan", "concrete plans")} in the last ${EIGHT}.`,
            interpretation: "Making specific plans is often the clearest sign of real interest in seeing you.",
          };
          break;
        case "initiates":
          c = {
            fact: `He started ${this.fb.pct(W.hInitShare ?? 0)} of conversations in the last ${EIGHT}.`,
            interpretation: "Reaching out first suggests you're on his mind.",
          };
          break;
      }
      if (!c) continue;
      const claim: Claim = { ...c, confidence: ids.length >= 2 ? "high" : "medium", evidenceIds: ids };
      (hit.side === "interest" ? interest : distance).push(claim);
    }

    let combination: string;
    if (interest.length && distance.length) {
      combination =
        "You're not imagining it — some of his behavior points toward interest and some points away. When words and actions disagree, actions tend to be the more reliable signal.";
    } else if (distance.length) {
      combination = "The signals here lean one way: his recent behavior shows more distance than interest.";
    } else if (interest.length) {
      combination = "His signals are more consistent than mixed — what he says and what he does mostly line up.";
    } else {
      combination = this.lite
        ? "Mixed-signal patterns need timestamps to detect. Upload a WhatsApp export for this section."
        : "We didn't find strong signals in either direction recently.";
    }
    if (this.a.breadcrumbing) {
      combination +=
        " Together, these form a pattern consistent with breadcrumbing — intermittent attention without much follow-through.";
    }
    return { interest, distance, combination, breadcrumbing: this.a.breadcrumbing };
  }

  // ── M1 Summary ──

  private summaryModule(tp: TurningPoint | null, youEffort: number): FullReport["summary"] {
    const q = this.input.question;
    const level = this.a.interest.level;
    const t = this.a.totals;
    const distanceCount = this.a.mixedSignals.filter((m) => m.side === "distance").length;

    let headline: string;
    if ((q === "losing_interest" || q === "energy_changed" || q === "ex_came_back" || (q === "overview" && tp)) && !this.lite) {
      headline = tp
        ? tp.direction === "cooling"
          ? `His observable effort dropped around ${this.fb.date(tp.date)}.`
          : `His effort picked up around ${this.fb.date(tp.date)}.`
        : "His texting pattern has been fairly steady — no sharp drop.";
    } else if (q === "mixed_signals") {
      headline =
        distanceCount > 0
          ? `We found ${this.fb.count(distanceCount, "place", "places")} where his words and actions don't line up.`
          : "His signals are more consistent than they might feel.";
    } else if (q === "more_invested") {
      headline =
        youEffort >= 0.55
          ? "You're putting in more of the effort."
          : youEffort > 0.45
            ? "The effort between you is fairly balanced."
            : "He's putting in more of the effort.";
    } else {
      headline = `His texting shows ${LEVEL_PHRASE[level]}.`;
    }

    const paragraphs: string[] = [];
    paragraphs.push(
      this.pick([
        `Based on ${this.fb.count(this.a.preview.totalMessages, "message", "messages")}, his texting shows ${LEVEL_PHRASE[level]}. ${LEVEL_NOTE[level]}`,
        `We read ${this.fb.count(this.a.preview.totalMessages, "message", "messages")} between you two. Overall, his behavior shows ${LEVEL_PHRASE[level]}. ${LEVEL_NOTE[level]}`,
      ]),
    );

    const claims: Claim[] = [];
    if (tp && !this.lite) {
      const n = this.tpNarrative(tp);
      const top = tp.drivers[0];
      const others = tp.drivers.slice(1).map((d) => DRIVER[d.metric]?.phrase).filter(Boolean);
      if (top) {
        paragraphs.push(
          `The clearest change came around ${this.fb.date(tp.date)}: his ${DRIVER[top.metric]?.phrase ?? top.metric} went from ${this.fmtDriver(top.metric, top.before)} to ${this.fmtDriver(top.metric, top.after)}` +
            (others.length ? `, and his ${others.join(" and ")} moved at the same time.` : "."),
        );
      }
      claims.push({ fact: n.fact, interpretation: n.interpretation, confidence: tp.confidence, evidenceIds: n.evidenceIds.slice(0, 4) });
    } else if (!this.lite && this.a.enoughForTurningPoints) {
      paragraphs.push("We didn't find a sharp change in his behavior — his effort has been fairly consistent over time.");
    }

    if (!this.lite) {
      const yInit = share(t.Y.initiations, t.H.initiations);
      paragraphs.push(
        `Across the whole chat, you started ${this.fb.pct(yInit)} of conversations and he started ${this.fb.pct(1 - yInit)}. His typical reply time is ${this.fb.minutes(t.H.replyP50)}; yours is ${this.fb.minutes(t.Y.replyP50)}.`,
      );
    } else {
      paragraphs.push(
        `You sent ${this.fb.pct(share(t.Y.msgCount, t.H.msgCount))} of the messages in what you pasted. Without timestamps, we can't measure reply times or changes over time.`,
      );
    }
    return { headline, paragraphs, claims };
  }

  // ── M6 Next step ──

  private nextStepModule(tp: TurningPoint | null): FullReport["nextStep"] {
    const ids = new Set(this.a.mixedSignals.filter((m) => m.side === "distance").map((m) => m.id));
    const q = this.input.question;

    if (q === "ex_came_back") {
      return {
        question: "What's different for you this time?",
        why: "Before trying again, it may help to talk about what caused problems last time and what would be different now.",
        howToAsk: "Ask it calmly and early, before you're back in the old rhythm. Then watch whether his actions match the answer.",
      };
    }
    if (ids.has("flirt_no_plans") || ids.has("vague_plans")) {
      return {
        responseGuide: "plans",
        question: "I'd like to see you. Are you free this week?",
        why: "Some of the messages leave plans open. If you still want to meet, a specific invitation gives him a chance to help arrange it.",
        howToAsk: "Suggest a day or something you'd enjoy doing together. Leave room for him to suggest another time.",
      };
    }
    if (ids.has("words_vs_followthrough")) {
      return {
        question: "What's making it hard to follow through on plans lately?",
        why: "The gap between what he says and what happens is the clearest pattern here. Asking about it directly is kinder to you than guessing.",
        howToAsk: "Mention a plan you were looking forward to and ask what happened. Leave room to hear his explanation.",
      };
    }
    if (ids.has("disappear_return")) {
      return {
        question: "When you go quiet for a few days, what's usually going on for you?",
        why: "The on-and-off rhythm is what keeps this uncertain. His answer, and whether the rhythm changes, will tell you more than any single text.",
        howToAsk: "Choose a moment when you feel ready to talk. Explain how the gaps affect you and ask what kind of contact works for both of you.",
      };
    }
    if (ids.has("busy_pattern")) {
      return {
        question: "It sounds like things are really full for you right now. Do you still have room for this?",
        why: "Busy is real, but it's been a recurring theme alongside less initiation. This gives him an easy, honest way to answer.",
        howToAsk: "Say it warmly and mean it. Either answer is useful information.",
      };
    }
    if (ids.has("replies_never_initiates")) {
      return {
        question: "I'd like you to reach out sometimes too. How does that feel to you?",
        why: "He responds, but rarely starts things. Naming it lets you find out whether that's just his style or a signal.",
        howToAsk: "Keep it observational and light. Then notice whether he starts a conversation in the next few days.",
      };
    }
    if (ids.has("late_night_only")) {
      return {
        question: "I'd love to talk more during the day too. Would that work for you?",
        why: "Mostly late-night contact is ambiguous. A simple request shows whether he's willing to show up in other parts of his day.",
        howToAsk: "Frame it as something you want, not something he's doing wrong.",
      };
    }
    if (tp && tp.direction === "cooling") {
      return {
        question: "I've noticed things feel a bit different lately. Is something going on on your end?",
        why: "His texting has changed. Asking about it gives him a chance to explain what the messages alone can't show.",
        howToAsk: "Keep it about what you've noticed, not what it means. Give him room to answer honestly.",
      };
    }
    if (q === "situationship") {
      return {
        question: "What are you looking for with us right now?",
        why: "Texting patterns can show effort, but not intentions. This is the question only he can answer.",
        howToAsk: "Choose a way to talk that feels comfortable. Share what you're looking for too.",
      };
    }
    if (this.a.interest.level === "strong") {
      return {
        responseGuide: "plans",
        question: "Want to make plans for this weekend?",
        why: "His effort is consistent and visible. The next step is less about decoding him and more about building on it.",
        howToAsk: "Suggest something specific you'd enjoy together.",
      };
    }
    return {
      question: "How are you feeling about where this is going?",
      why: "The texts show a lot, but not what he's hoping for. A simple, open question gets you the part the data can't.",
      howToAsk: "Ask it without pressure, and share your own answer too.",
    };
  }
}
