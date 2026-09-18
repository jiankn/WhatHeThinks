/**
 * 分析引擎的可调阈值，集中在此以便一处调参。
 * 详见 docs/signal-scoring-spec.md。
 */

export const CONFIG = {
  /** 会话切分：相邻消息间隔 ≥ 该值（毫秒）视为新会话。§2 */
  SESSION_GAP_MS: 6 * 60 * 60 * 1000,
  /** 重新激活：间隔 ≥ 该值后开启会话的一方。§2 */
  REENGAGE_GAP_MS: 48 * 60 * 60 * 1000,
  /** 长沉默阈值。§2 */
  LONG_SILENCE_MS: 72 * 60 * 60 * 1000,
  /** 夜间空档：跨越 00:00–06:00 且短于该值，标记为 overnight，不计长沉默。§2 */
  OVERNIGHT_MAX_MS: 12 * 60 * 60 * 1000,
  /** double text：自己发消息后 ≥ 该间隔又发、期间对方无回复。§3 */
  DOUBLE_TEXT_MS: 30 * 60 * 1000,

  /** 最少消息数，低于则拒绝分析。PRD §5.1 */
  MIN_MESSAGES: 50,
  /** 低于该消息数或天数时仍分析，但转折点标记"历史不足"。PRD §5.1 */
  MIN_MESSAGES_FOR_TURNING_POINTS: 300,
  MIN_DAYS_FOR_TURNING_POINTS: 21,
  /** 解析上限。PRD §5.1 */
  MAX_MESSAGES: 200_000,
} as const;
