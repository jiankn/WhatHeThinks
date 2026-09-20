"use client";

import { CheckIcon } from "@/components/icons";

export type Stage = "parsing" | "sessions" | "trends" | "turning" | "evidence" | "done";

const STAGES: { key: Exclude<Stage, "done">; label: string }[] = [
  { key: "parsing", label: "Reading every message" },
  { key: "sessions", label: "Splitting conversations" },
  { key: "trends", label: "Measuring effort week by week" },
  { key: "turning", label: "Looking for when things changed" },
  { key: "evidence", label: "Pulling the receipts" },
];

export function AnalyzingStep({
  stage,
  failed,
  onRetry,
}: {
  stage: Stage;
  failed: boolean;
  onRetry: () => void;
}) {
  const current = stage === "done" ? STAGES.length : STAGES.findIndex((s) => s.key === stage);

  return (
    <section className="pt-10 text-center">
      {failed ? (
        <div className="analyzing-error-mark" aria-hidden="true">!</div>
      ) : (
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-[3px] border-rose-soft border-t-rose [animation-duration:1.4s]" aria-hidden="true" />
      )}
      <h1 className="mt-6 font-display text-3xl font-semibold">{failed ? "Your analysis is ready, but we couldn't save it." : "Reading the signals…"}</h1>
      <p className="mt-2 text-muted" aria-live="polite">{failed ? "Your chat is still on this device. Try saving the report again." : `Now: ${STAGES[Math.max(0, current)]?.label ?? "Finishing your report"}.`}</p>

      <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current && !failed;
          return (
            <li key={s.key} className={`flex items-center gap-3 text-sm ${done || active ? "text-ink" : "text-faint"}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  done ? "bg-rose text-white" : active ? "border-2 border-rose" : "border border-line"
                }`}
              >
                {done && <CheckIcon className="h-3 w-3" />}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>

      {failed && (
        <div className="mt-8 space-y-3">
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
