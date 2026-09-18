/**
 * 分析引擎的核心数据类型。
 * 详见 docs/signal-scoring-spec.md §1.4。
 */

export type MsgType = "text" | "media" | "deleted" | "call";

/** 一条规范化后的消息。ts 为 epoch 毫秒；导出无时区，全程按 UTC 处理，仅展示时格式化。 */
export interface Msg {
  id: number;
  ts: number;
  sender: string;
  text: string;
  type: MsgType;
}

/** 日期字段顺序：月/日 或 日/月，或无法判定。 */
export type DateOrder = "MDY" | "DMY" | "ambiguous";

export interface Participant {
  name: string;
  count: number;
}

export interface ParseResult {
  messages: Msg[];
  /** 按消息数降序的参与者列表。 */
  participants: Participant[];
  dateOrder: DateOrder;
  /** 被丢弃的系统消息行数。 */
  systemLineCount: number;
  /** 是否解析到时间戳。false 表示纯文本粘贴的 Lite 模式（无回复时间/转折点）。 */
  hadTimestamps: boolean;
}
