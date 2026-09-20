/**
 * 预览页的"数据驱动侧重点"：根据用户自己的预览数据推荐完整报告该深挖的问题。
 * 取代上传前的 8 选 1 选题页——问题来自她的聊天，而不是通用列表。
 */

import type { Preview } from "@/lib/analysis/analysis-types";
import { fmtDate, fmtMinutes, fmtPct } from "@/lib/format";
import type { QuestionId } from "@/lib/questions";

export interface FocusOption {
  id: QuestionId;
  label: string;
  /** 为什么推荐：引用她数据里的具体数字。 */
  reason: string;
}

const MAX_SUGGESTIONS = 3;

export function suggestFocus(p: Preview): FocusOption[] {
  const out: FocusOption[] = [];
  const h = p.headline;

  if (h && !p.liteMode) {
    const warming = h.direction ? h.direction === "warming" : /increased/.test(h.sentence);
    out.push({
      id: warming ? "energy_changed" : "losing_interest",
      label: warming ? `What changed around ${fmtDate(h.date)}?` : `Is he pulling away since ${fmtDate(h.date)}?`,
      reason: shiftReason(h),
    });
  }

  if (p.counts.mixedSignals > 0) {
    const n = p.counts.mixedSignals;
    out.push({
      id: "mixed_signals",
      label: "Are these mixed signals?",
      reason: `We spotted ${n} ${n === 1 ? "moment" : "moments"} where his words and actions don't line up.`,
    });
  }

  const youShare = p.liteMode ? p.messageShare.you : p.initiation.you;
  if (youShare >= 0.6) {
    out.push({
      id: "more_invested",
      label: "Am I doing all the work?",
      reason: p.liteMode
        ? `You sent ${fmtPct(youShare)} of the messages.`
        : `You started ${fmtPct(youShare)} of your conversations.`,
    });
  }

  if (!p.liteMode && !h && p.medianReply.him > p.medianReply.you * 2 && p.medianReply.him > 30) {
    out.push({
      id: "losing_interest",
      label: "Is he losing interest?",
      reason: "His typical reply takes more than twice as long as yours.",
    });
  }

  out.push({
    id: "likes_me",
    label: "Does he actually like me?",
    reason: "We score his initiative, curiosity and plans across the whole chat.",
  });
  out.push({
    id: "situationship",
    label: "Is this going anywhere?",
    reason: "We look at whether plans get made — and kept.",
  });

  const seen = new Set<QuestionId>();
  return out.filter((o) => !seen.has(o.id) && seen.add(o.id)).slice(0, MAX_SUGGESTIONS);
}

/** 推荐理由引用前后对比数字；预览标题已经说过的那句话不再重复。 */
function shiftReason(h: NonNullable<Preview["headline"]>): string {
  const c = h.comparison;
  if (c && h.metric === "reply") return `His typical reply went from ${fmtMinutes(c.reply.before)} to ${fmtMinutes(c.reply.after)}.`;
  if (c && h.metric === "initiation")
    return `He went from starting ${fmtPct(c.initiation.before)} of your chats to ${fmtPct(c.initiation.after)}.`;
  return h.sentence;
}
