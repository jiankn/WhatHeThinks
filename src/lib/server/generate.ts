/**
 * 付费后生成完整报告：DeepSeek → 英文/结构/证据校验（失败重试一次）→ Claim Checker → 保存。
 * 详见 docs/prompt-architecture.md §2、§6。日志只记 reportId / 违规类型，不记任何消息文本。
 */

import { checkReport } from "@/lib/report/claim-checker";
import { DeepSeekReportWriter } from "./deepseek-writer";
import type { ReportWriter } from "@/lib/report/writer";
import { getAnalysis, getEvidence, getReportRow, saveReport, setStatus } from "./reports";

/** Paid reports always use DeepSeek; missing configuration must never return a template. */
export function getWriter(env: CloudflareEnv): ReportWriter {
  return new DeepSeekReportWriter(env.DEEPSEEK_API_KEY ?? "", env.DEEPSEEK_MODEL);
}

export async function generateReport(db: D1Database, id: string, env: CloudflareEnv): Promise<boolean> {
  const row = await getReportRow(db, id);
  if (!row) return false;
  try {
    const evidence = await getEvidence(db, id);
    const { report, allowed } = await getWriter(env).write({
      reportId: id,
      question: row.question,
      customQuestion: row.custom_question,
      analysis: getAnalysis(row),
      evidence,
    });
    const violations = checkReport(report, { allowed, evidenceIds: new Set(evidence.map((e) => e.id)), requireHedges: false });
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
      throw new Error("Report validation failed");
    }
    await saveReport(db, id, report);
    return true;
  } catch (err) {
    console.error(JSON.stringify({ evt: "generate_failed", reportId: id, error: err instanceof Error ? err.name : "unknown" }));
    await setStatus(db, id, "failed");
    return false;
  }
}
