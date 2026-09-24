/**
 * 付费后生成完整报告：DeepSeek（不行换 GLM）→ 英文/结构/证据校验（可修复则自动修复，否则带说明重写）→ Claim Checker → 保存。
 * 详见 docs/prompt-architecture.md §2、§6。日志只记 reportId / 违规类型，不记任何消息文本。
 */

import { checkReport } from "@/lib/report/claim-checker";
import { deepseekProvider, glmProvider, LlmReportWriter } from "./llm-writer";
import type { ReportWriter } from "@/lib/report/writer";
import { claimPregen, focusKey, getAnalysis, getEvidence, getPregen, getReportRow, publishPregen, recordEvent, savePregen, saveReport, setStatus, type ReportRow } from "./reports";
import type { FullReport } from "@/lib/report/types";

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

/** 写一份完整报告并通过最终检查；不合格时抛出带 reasons（规则编号，无文本）的错误。付款后生成与付款前预写共用。 */
async function writeCheckedReport(db: D1Database, row: ReportRow, env: CloudflareEnv): Promise<{ report: FullReport; failures: string[] }> {
  const evidence = await getEvidence(db, row.id);
  const { report, allowed, failures } = await getWriter(env).write({
    reportId: row.id,
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
        reportId: row.id,
        count: violations.length,
        kinds: [...new Set(violations.map((v) => v.kind))],
        paths: violations.map((v) => v.path).slice(0, 10),
      }),
    );
    throw Object.assign(new Error("Report validation failed"), { reasons: violations.slice(0, 12).map((v) => `claim_check:${v.kind}:${v.path}`) });
  }
  return { report, failures: failures ?? [] };
}

const reasonsOf = (err: unknown) => (err as { reasons?: string[] } | null)?.reasons ?? [err instanceof Error ? err.name : "unknown"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 付款时预写还在进行：最多等这么久，再退回付款后生成。 */
const PREGEN_WAIT_MS = 90_000;
const PREGEN_POLL_MS = 3_000;

/** 付款前已为当前问题写好的报告：直接启用；还在写就等一会儿。用不上返回 false。 */
async function usePregen(db: D1Database, id: string, wait = PREGEN_WAIT_MS): Promise<boolean> {
  for (let waited = 0; ; waited += PREGEN_POLL_MS) {
    const row = await getReportRow(db, id);
    const pregen = row && getPregen(row);
    if (!row || !pregen || pregen.for !== focusKey(row)) return false;
    if (pregen.status === "ready" && row.report_json) return publishPregen(db, id);
    if (pregen.status !== "pending" || waited >= wait) return false;
    await sleep(PREGEN_POLL_MS);
  }
}

export async function generateReport(db: D1Database, id: string, env: CloudflareEnv): Promise<boolean> {
  const row = await getReportRow(db, id);
  if (!row) return false;
  if (await usePregen(db, id)) {
    await recordEvent(db, "generate_from_pregen", id, {});
    return true;
  }
  try {
    const { report, failures } = await writeCheckedReport(db, row, env);
    await saveReport(db, id, report);
    // 中途失败、换过模型或自动修复过的，也记下原因，便于观察各模型的问题分布
    if (failures.length) await recordEvent(db, "generate_recovered", id, { model: report.meta.model, reasons: failures.slice(0, 30) });
    return true;
  } catch (err) {
    // 原因写进 events 表，线上无需实时日志也能排查；只有状态码与规则编号，没有消息文本
    const reasons = reasonsOf(err);
    console.error(JSON.stringify({ evt: "generate_failed", reportId: id, error: err instanceof Error ? err.name : "unknown", reasons }));
    await recordEvent(db, "generate_failed", id, { reasons: reasons.slice(0, 30) });
    await setStatus(db, id, "failed");
    return false;
  }
}

/**
 * 付款前预先写好完整报告（免费预览打开后在后台进行）。付款后即可直接打开；
 * 失败时什么都不影响，付款后照常生成。每份报告每个问题最多写一次。
 */
export async function prepareReport(db: D1Database, id: string, env: CloudflareEnv): Promise<"ready" | "failed" | "skipped"> {
  const row = await getReportRow(db, id);
  if (!row || row.paid_at !== null) return "skipped";
  const key = focusKey(row);
  if (!(await claimPregen(db, id, key))) return "skipped";
  await recordEvent(db, "pregen_started", id, {});
  try {
    const { report, failures } = await writeCheckedReport(db, row, env);
    await savePregen(db, id, key, report);
    await recordEvent(db, "pregen_ready", id, { model: report.meta.model, reasons: failures.slice(0, 30) });
    return "ready";
  } catch (err) {
    await savePregen(db, id, key, null);
    await recordEvent(db, "pregen_failed", id, { reasons: reasonsOf(err).slice(0, 30) });
    return "failed";
  }
}
