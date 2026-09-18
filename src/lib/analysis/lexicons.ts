/**
 * 词典信号。全部为带词边界、忽略大小写的正则。
 * 命中携带 msgId，可作为证据。详见 docs/signal-scoring-spec.md §4。
 * MVP 仅覆盖英文。
 */

export const LEX = {
  // §4.1 计划
  planProposal:
    /\b(let's|lets|wanna|want to|we should|come over|pick you up|are you free|you free|how about|down to|you up for)\b/i,
  activity:
    /\b(dinner|drinks?|coffee|lunch|movie|date|hang(?:\s?out)?|meet|see you|come over|walk|brunch|concert|show|grab)\b/i,
  timeWord:
    /\b(tonight|tomorrow|this (?:weekend|week|morning|afternoon|evening)|next (?:week|weekend|month|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\d{1,2}(?::\d{2})?\s?(?:am|pm)|at \d{1,2})\b/i,
  planCancel:
    /\b(rain ?check|can'?t make it|cancel|reschedule|something came up|another time|next time)\b/i,

  // §4.2 温度
  affection:
    /\b(miss you|thinking (?:about|of) you|can'?t wait|babe|baby|beautiful|gorgeous|cutie|sweetheart|xo+|love (?:that|you|it))\b|[❤️\u{1F970}\u{1F618}\u{1F60D}\u{1F495}\u{1F496}\u{1F63B}\u{1FAF6}]/iu,
  laughter: /\b(ha(?:ha)+|lol|lmao|rofl)\b|[\u{1F602}\u{1F923}]/iu,
  apology: /\b(sorry|my bad|i apologi[sz]e|didn'?t mean)\b/i,
  support:
    /\b(how are you feeling|hope you'?re ok|proud of you|you got this|here for you|how did (?:it|the) .* go|are you ok)\b/i,
  busyExcuse:
    /\b(busy|swamped|crazy (?:day|week)|long day|so tired|exhausted|slammed)\b/i,

  // §6 冲突（用于"变化发生在争吵之前"判断）
  conflict:
    /\b(why do you|why don'?t you|you never|you always|we need to talk|are you mad|are you upset|whatever|forget it|nevermind|never mind)\b|\bfine[.!]/i,
} as const;

/** §3 提问判定：含 "?"，或以疑问词开头且长度 ≤ 200。 */
const QUESTION_START =
  /^(what|when|where|why|how|who|which|do|does|did|are|is|was|were|can|could|would|will|should|have|has|wanna|want to)\b/i;

export function isQuestion(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || t.length > 200) return false;
  if (t.includes("?")) return true;
  return QUESTION_START.test(t);
}

/** §4.3 干瘪回复：≤2 词、非提问、非纯笑。 */
export function isDryReply(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;
  if (isQuestion(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 2) return false;
  if (LEX.laughter.test(t) && words.length <= 1) return false;
  return true;
}
