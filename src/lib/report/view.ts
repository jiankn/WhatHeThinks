/**
 * GET /api/reports/:id 的响应结构，前后端共用。
 * 付费前只含 preview；付费后才含完整报告与证据。
 */

import type { EvidenceMsg, Preview } from "@/lib/analysis/analysis-types";
import type { QuestionId } from "@/lib/questions";
import type { FullReport } from "./types";

export type ReportStatus = "preview" | "generating" | "ready" | "failed";

export interface ReportView {
  id: string;
  status: ReportStatus;
  paid: boolean;
  question: QuestionId;
  customQuestion: string | null;
  createdAt: number;
  preview: Preview;
  /** 仅当 paid 且 status=ready 时存在。 */
  report?: FullReport;
  /** 仅当 paid 时存在；30 天后证据被清理则为空数组。 */
  evidence?: EvidenceMsg[];
  /** 当前访问者是否已登录、这份报告是否已保存在其账户下（用于“保存到账户”提示）。 */
  account?: { signedIn: boolean; saved: boolean };
}
