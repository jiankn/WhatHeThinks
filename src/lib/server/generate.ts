/**
 * 付费后生成完整报告：ReportWriter → Claim Checker → 删除不合格 claim → 保存。
 * 详见 docs/prompt-architecture.md §2、§6。日志只记 reportId / 违规类型，不记任何消息文本。
 */

import { checkReport, dropFailingClaims } from "@/lib/report/claim-checker";
import { MockReportWriter } from "@/lib/report/mock-writer";
import type { ReportWriter } from "@/lib/report/writer";
import { getAnalysis, getEvidence, getReportRow, saveReport, setStatus } from "./reports";

/** 之后接入 LLM 时在这里按环境变量切换实现。 */
export function getWriter(): ReportWriter {
  return new MockReportWriter();
}

export async function generateReport(db: D1Database, id: string): Promise<boolean> {
  const row = await getReportRow(db, id);
  if (!row) return false;
  try {
    const evidence = await getEvidence(db, id);
    const { report, allowed } = await getWriter().write({
      reportId: id,
      question: row.question,
      customQuestion: row.custom_question,
      analysis: getAnalysis(row),
      evidence,
    });
    const violations = checkReport(report, { allowed, evidenceIds: new Set(evidence.map((e) => e.id)) });
    if (violations.length) {
      console.warn(
        JSON.stringify({
          evt: "claim_check",
          reportId: id,
          count: violations.length,
          kinds: [...new Set(violations.map((v) => v.kind))],
          paths: violations.map((v) => v.path).slice(0, 10),
        }),
      );
    }
    await saveReport(db, id, dropFailingClaims(report, violations));
    return true;
  } catch (err) {
    console.error(JSON.stringify({ evt: "generate_failed", reportId: id, error: err instanceof Error ? err.name : "unknown" }));
    await setStatus(db, id, "failed");
    return false;
  }
}
