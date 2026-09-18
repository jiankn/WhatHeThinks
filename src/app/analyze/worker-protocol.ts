/** 主线程 ↔ 分析 Worker 的消息协议。 */

import type { Analysis } from "@/lib/analysis/analysis-types";
import type { DateOrder, Participant } from "@/lib/analysis/types";

export type WorkerIn =
  | { type: "parseFile"; name: string; buf: ArrayBuffer }
  | { type: "parseText"; text: string }
  | { type: "reparse"; dateOrder: "MDY" | "DMY" }
  | { type: "analyze"; youName: string; himName: string };

export interface ParseSummary {
  participants: Participant[];
  dateOrder: DateOrder;
  messageCount: number;
  range: [number, number] | null;
  hadTimestamps: boolean;
  /** 每个参与者最近的 2 条短消息，仅本地展示。 */
  samples: Record<string, string[]>;
}

export type WorkerErrorCode =
  | "no_messages"
  | "one_participant"
  | "too_large"
  | "too_few"
  | "zip_no_txt"
  | "unknown";

export type WorkerOut =
  | { type: "parsed"; summary: ParseSummary }
  | { type: "analyzed"; analysis: Analysis }
  | { type: "error"; code: WorkerErrorCode; message?: string };

export const ERROR_COPY: Record<WorkerErrorCode, string> = {
  no_messages:
    "We couldn't find any messages in that file. Make sure it's a WhatsApp export (.txt or .zip), or paste lines like “Name: message”.",
  one_participant: "We only found one person in this chat. We need both sides of the conversation.",
  too_large: "This chat is larger than we can handle right now (200,000 messages). Try exporting a shorter range.",
  too_few:
    "There aren't enough messages between you two yet — we need at least 50 to find real patterns.",
  zip_no_txt: "That .zip doesn't contain a chat .txt file. Export the chat from WhatsApp again (“Without media” works best).",
  unknown: "Something went wrong reading this chat. Try exporting it again, or paste the text instead.",
};
