/**
 * 付费后生成完整报告：DeepSeek → 英文/结构/证据校验（失败重试一次）→ Claim Checker → 保存。
 * 详见 docs/prompt-architecture.md §2、§6。日志只记 reportId / 违规类型，不记任何消息文本。
 */

import { checkReport } from "@/lib/report/claim-checker";
import { DeepSeekReportWriter } from "./deepseek-writer";
import type { ReportWriter } from "@/lib/report/writer";
import { getAnalysis, getEvidence, getReportRow, recordEvent, saveReport, setStatus } from "./reports";

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
      throw Object.assign(new Error("Report validation failed"), { reasons: violations.slice(0, 12).map((v) => `claim_check:${v.kind}:${v.path}`) });
    }
    await saveReport(db, id, report);
    return true;
  } catch (err) {
    // 原因写进 events 表，线上无需实时日志也能排查；只有状态码与规则编号，没有消息文本
    const reasons = (err as { reasons?: string[] } | null)?.reasons ?? [err instanceof Error ? err.name : "unknown"];
    console.error(JSON.stringify({ evt: "generate_failed", reportId: id, error: err instanceof Error ? err.name : "unknown", reasons }));
    await recordEvent(db, "generate_failed", id, { reasons: reasons.slice(0, 30) });
    await setStatus(db, id, "failed");
    return false;
  }
}
