"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import type { Findings } from "../findings";

export type Stage = "parsing" | "sessions" | "trends" | "turning" | "evidence" | "writing" | "done";
type WorkStage = Exclude<Stage, "done">;

const STAGES: { key: WorkStage; label: string }[] = [
  { key: "parsing", label: "Reading every message" },
  { key: "sessions", label: "Splitting conversations" },
  { key: "trends", label: "Measuring effort week by week" },
  { key: "turning", label: "Looking for when things changed" },
  { key: "evidence", label: "Pulling the receipts" },
  { key: "writing", label: "Writing your report" },
];

/** 各阶段对应的进度条位置；最后一段只到 92%，等服务器真正返回才走满。 */
const PROGRESS: Record<Stage, number> = { parsing: 10, sessions: 26, trends: 44, turning: 62, evidence: 78, writing: 92, done: 100 };

export function AnalyzingStep({
  stage,
  findings,
  failed,
  onRetry,
}: {
  stage: Stage;
  findings: Findings | null;
  failed: boolean;
  onRetry: () => void;
}) {
  const current = stage === "done" ? STAGES.length : STAGES.findIndex((s) => s.key === stage);
  const [slow, setSlow] = useState(false);

  // 写报告等太久时给一句预期，避免用户以为卡住了。
  useEffect(() => {
    setSlow(false);
    if (stage !== "writing") return;
    const t = window.setTimeout(() => setSlow(true), 9000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <section className="analyzing">
      <div className="analyzing-progress" aria-hidden="true">
        <span style={{ width: `${failed ? PROGRESS.writing : PROGRESS[stage]}%` }} />
      </div>

      <h1 className="analyzing-title">{failed ? "Your analysis is ready, but we couldn't save it." : stage === "done" ? "Your report is ready." : "Reading the signals…"}</h1>
      <p className="analyzing-sub" aria-live="polite">
        {failed
          ? "Your chat is still on this device. Try saving the report again."
          : stage === "done"
            ? "Opening it now."
            : slow
              ? "Almost there. This usually takes under 30 seconds."
              : `Now: ${STAGES[Math.max(0, current)]?.label ?? "Finishing your report"}.`}
      </p>

      <ol className="analyzing-list">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current && !failed;
          const finding = findings && s.key !== "writing" ? findings[s.key] : null;
          return (
            <li key={s.key} className={`analyzing-item ${done ? "is-done" : active ? "is-active" : ""}`}>
              <span className="analyzing-mark" aria-hidden="true">
                {done && <CheckIcon className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="analyzing-label">
                  {s.label}
                  {active && <span className="analyzing-dots" aria-hidden="true"><i /><i /><i /></span>}
                </p>
                {done && finding && <p className="analyzing-finding">{finding}</p>}

                {s.key === "trends" && (done || active) && findings && findings.weekly.length > 1 && (
                  <div className="analyzing-chart" aria-hidden="true">
                    {findings.weekly.map((v, j) => (
                      <i key={j} style={{ height: `${Math.max(8, v * 100)}%`, animationDelay: `${j * 70}ms` }} />
                    ))}
                  </div>
                )}

                {s.key === "evidence" && (done || active) && findings && findings.receipts.length > 0 && (
                  <div className="analyzing-receipts" aria-hidden="true">
                    {findings.receipts.map((r, j) => (
                      <span key={j} className={r.mine ? "is-mine" : ""} style={{ animationDelay: `${j * 260}ms` }}>
                        {r.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {failed && (
        <div className="mt-8 space-y-3 text-center">
          <p role="alert" className="text-sm text-rose-dark">
            Check your connection, then try again. You do not need to upload the chat again.
          </p>
          <button className="btn-primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
