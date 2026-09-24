/**
 * 付费后生成完整报告：DeepSeek（不行换 GLM）→ 英文/结构/证据校验（可修复则自动修复，否则带说明重写）→ Claim Checker → 保存。
 * 详见 docs/prompt-architecture.md §2、§6。日志只记 reportId / 违规类型，不记任何消息文本。
 */

import { checkReport } from "@/lib/report/claim-checker";
import { deepseekProvider, glmProvider, LlmReportWriter } from "./llm-writer";
import type { ReportWriter } from "@/lib/report/writer";
import { getAnalysis, getEvidence, getReportRow, recordEvent, saveReport, setStatus } from "./reports";

/**
 * 付费报告先用 DeepSeek，不合格再换智谱 GLM；未配置的模型自动跳过。
 * 都没配置时直接失败，绝不返回模板报告。
 */
export function getWriter(env: CloudflareEnv): ReportWriter {
  return getLlmWriter(env);
}

/** 同一条模型链，也用于免费预览的开头。 */
export function getLlmWriter(env: CloudflareEnv): LlmReportWriter {
  return new LlmReportWriter([
    deepseekProvider(env.DEEPSEEK_API_KEY ?? "", env.DEEPSEEK_MODEL),
    // FALLBACK_API_KEY 是智谱 GLM 的 key
    glmProvider(env.FALLBACK_API_KEY ?? "", env.GLM_MODEL),
  ]);
}

/** 至少配置了一家写报告的模型，才接受新付款。 */
export function hasReportModel(env: CloudflareEnv): boolean {
  return Boolean(env.FALLBACK_API_KEY?.trim() || env.DEEPSEEK_API_KEY?.trim());
}

export async function generateReport(db: D1Database, id: string, env: CloudflareEnv): Promise<boolean> {
  const row = await getReportRow(db, id);
  if (!row) return false;
  try {
    const evidence = await getEvidence(db, id);
    const { report, allowed, failures } = await getWriter(env).write({
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
    // 中途失败、换过模型或自动修复过的，也记下原因，便于观察各模型的问题分布
    if (failures?.length) await recordEvent(db, "generate_recovered", id, { model: report.meta.model, reasons: failures.slice(0, 30) });
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
