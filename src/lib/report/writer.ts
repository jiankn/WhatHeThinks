/**
 * ReportWriter 接口。付费报告使用 DeepSeek；MockReportWriter 仅为测量数据与测试提供确定性结构。
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
  /** failures：成功前的失败尝试与自动修复（状态码/规则编号，不含文本），用于监控。 */
  write(input: ReportInput): Promise<{ report: FullReport; allowed: string[]; failures?: string[] }>;
}
