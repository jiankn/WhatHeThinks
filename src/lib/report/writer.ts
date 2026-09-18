/**
 * ReportWriter 接口。MVP 用 MockReportWriter；之后接 LLMReportWriter 时不改前端与数据模型。
 * 详见 docs/prompt-architecture.md §3。
 */

import type { EvidenceMsg } from "@/lib/analysis/analysis-types";
import type { QuestionId } from "@/lib/questions";
import type { SlimAnalysis } from "./payload";
import type { FullReport } from "./types";

export interface ReportInput {
  reportId: string;
  question: QuestionId;
  customQuestion: string | null;
  analysis: SlimAnalysis;
  evidence: EvidenceMsg[];
}

export interface ReportWriter {
  readonly name: "mock" | "llm";
  /** 返回报告与允许出现的数字/日期字符串（供 Claim Checker 使用）。 */
  write(input: ReportInput): Promise<{ report: FullReport; allowed: string[] }>;
}
