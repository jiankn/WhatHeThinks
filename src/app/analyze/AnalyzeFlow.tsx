"use client";

/**
 * /analyze 四步流程：选问题 → 上传/粘贴 → 确认 You/Him → 分析。
 * 解析与分析在 Web Worker 里完成；只有派生数据 + 脱敏证据会上传。详见 docs/PRD.md §3。
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "@/components/icons";
import { track } from "@/lib/events";
import { buildUpload } from "@/lib/report/payload";
import type { QuestionId } from "@/lib/questions";
import { saveToken } from "@/lib/report/token-store";
import { AnalyzingStep, type Stage } from "./steps/AnalyzingStep";
import { IdentifyStep } from "./steps/IdentifyStep";
import { InputStep } from "./steps/InputStep";
import { QuestionStep } from "./steps/QuestionStep";
import { ERROR_COPY, type ParseSummary, type WorkerIn, type WorkerOut } from "./worker-protocol";

type Step = "question" | "input" | "identify" | "analyzing";
const STEP_INDEX: Record<Step, number> = { question: 0, input: 1, identify: 2, analyzing: 3 };
const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** 分析动画的最短时长：分析本身很快，但太快会让结果显得廉价。 */
const MIN_ANALYZE_MS = 2400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AnalyzeFlow({ initialQuestion }: { initialQuestion: QuestionId | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialQuestion ? "input" : "question");
  const [question, setQuestion] = useState<QuestionId | null>(initialQuestion);
  const [customQuestion, setCustomQuestion] = useState("");
  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("parsing");
  const [uploadFailed, setUploadFailed] = useState(false);
  const pair = useRef<{ you: string; him: string } | null>(null);

  // ── Worker：一次一个请求，用 Promise 包装 ──
  const worker = useRef<Worker | null>(null);
  const pending = useRef<((m: WorkerOut) => void) | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("./analyze.worker.ts", import.meta.url));
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      pending.current?.(e.data);
      pending.current = null;
    };
    w.onerror = () => {
      pending.current?.({ type: "error", code: "unknown" });
      pending.current = null;
    };
    worker.current = w;
    track("analyze_start", initialQuestion ? { q: initialQuestion } : undefined);
    return () => w.terminate();
  }, [initialQuestion]);

  // 每次切换步骤都滚回顶部，确保看到新步骤的标题。
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const call = useCallback((msg: WorkerIn, transfer?: Transferable[]) => {
    return new Promise<WorkerOut>((resolve) => {
      pending.current = resolve;
      worker.current?.postMessage(msg, transfer ?? []);
    });
  }, []);

  const handleParsed = (res: WorkerOut) => {
    if (res.type === "parsed") {
      setSummary(res.summary);
      setStep("identify");
      track("upload_parsed", {
        messages: res.summary.messageCount,
        participants: res.summary.participants.length,
        lite: !res.summary.hadTimestamps,
      });
    } else if (res.type === "error") {
      setError(ERROR_COPY[res.code]);
      track("parse_failed", { code: res.code });
    }
  };

  const onFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is over 50 MB. Export the chat “Without media” and try again.");
      return;
    }
    setBusy(true);
    const buf = await file.arrayBuffer();
    handleParsed(await call({ type: "parseFile", name: file.name, buf }, [buf]));
    setBusy(false);
  };

  const onPaste = async (text: string) => {
    setError(null);
    setBusy(true);
    handleParsed(await call({ type: "parseText", text }));
    setBusy(false);
  };

  const onDateOrder = async (dateOrder: "MDY" | "DMY") => {
    setBusy(true);
    const res = await call({ type: "reparse", dateOrder });
    if (res.type === "parsed") setSummary(res.summary);
    setBusy(false);
  };

  const upload = async (analysis: Extract<WorkerOut, { type: "analyzed" }>["analysis"]) => {
    const { you, him } = pair.current!;
    const payload = buildUpload(analysis, { question: question!, customQuestion, youName: you, himName: him });
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`upload failed: ${res.status}`);
    return (await res.json()) as { id: string; token: string };
  };

  const onAnalyze = async (you: string, him: string) => {
    setError(null);
    setUploadFailed(false);
    pair.current = { you, him };
    setStep("analyzing");
    setStage("parsing");
    const started = Date.now();

    // 阶段文案按时间推进；真实计算在 Worker 中一次完成。
    const timers = (["sessions", "trends", "turning", "evidence"] as Stage[]).map((s, i) =>
      setTimeout(() => setStage(s), (i + 1) * (MIN_ANALYZE_MS / 5)),
    );
    const res = await call({ type: "analyze", youName: you, himName: him });
    if (res.type === "error") {
      timers.forEach(clearTimeout);
      setError(ERROR_COPY[res.code]);
      setStep("identify");
      return;
    }
    if (res.type !== "analyzed") return;

    try {
      const [created] = await Promise.all([upload(res.analysis), sleep(MIN_ANALYZE_MS - (Date.now() - started))]);
      timers.forEach(clearTimeout);
      setStage("done");
      saveToken(created.id, created.token);
      router.push(`/r/${created.id}#t=${created.token}`);
    } catch {
      timers.forEach(clearTimeout);
      setUploadFailed(true);
    }
  };

  const back = () => {
    setError(null);
    if (step === "input") setStep("question");
    if (step === "identify") setStep("input");
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-10 sm:pt-10">
      {step !== "analyzing" && (
        <div className="mb-6 flex items-center justify-between">
          {step !== "question" ? (
            <button onClick={back} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeftIcon /> Back
            </button>
          ) : (
            <span />
          )}
          <ol className="flex items-center gap-1.5" aria-label={`Step ${STEP_INDEX[step] + 1} of 3`}>
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === STEP_INDEX[step] ? "w-6 bg-rose" : i < STEP_INDEX[step] ? "w-3 bg-rose/40" : "w-3 bg-line"
                }`}
              />
            ))}
          </ol>
        </div>
      )}

      {error && step !== "analyzing" && (
        <p role="alert" className="mb-5 rounded-2xl border border-rose/25 bg-rose-soft px-4 py-3 text-sm text-rose-dark">
          {error}
        </p>
      )}

      {step === "question" && (
        <QuestionStep
          value={question}
          custom={customQuestion}
          onCustomChange={setCustomQuestion}
          onSelect={(q) => {
            setQuestion(q);
            track("question_selected", { q });
            if (q !== "custom") setStep("input");
          }}
          onContinue={() => setStep("input")}
        />
      )}

      {step === "input" && question && (
        <InputStep
          question={question}
          customQuestion={customQuestion}
          busy={busy}
          onFile={onFile}
          onPaste={onPaste}
          onChangeQuestion={() => setStep("question")}
        />
      )}

      {step === "identify" && summary && (
        <IdentifyStep summary={summary} busy={busy} onDateOrder={onDateOrder} onConfirm={onAnalyze} />
      )}

      {step === "analyzing" && (
        <AnalyzingStep
          stage={stage}
          failed={uploadFailed}
          onRetry={() => pair.current && onAnalyze(pair.current.you, pair.current.him)}
        />
      )}
    </main>
  );
}
