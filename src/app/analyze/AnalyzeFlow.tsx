"use client";

/**
 * /analyze 三步流程：上传/粘贴 → 确认 You/Him → 分析。
 * 不再要求上传前选题：默认 overview，落地页可带 ?q= 预设侧重点，
 * 预览页再根据数据推荐侧重点（FocusPicker）。
 * 解析与分析在 Web Worker 里完成；只有派生数据 + 脱敏证据会上传。详见 docs/PRD.md §3。
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "@/components/icons";
import { track } from "@/lib/events";
import { buildUpload } from "@/lib/report/payload";
import { DEFAULT_QUESTION, type QuestionId } from "@/lib/questions";
import type { ChatPlatformId } from "@/lib/platforms";
import { takePendingChat } from "@/lib/pending-chat";
import { saveToken } from "@/lib/report/token-store";
import { AnalyzingStep, type Stage } from "./steps/AnalyzingStep";
import { IdentifyStep } from "./steps/IdentifyStep";
import { InputStep } from "./steps/InputStep";
import { ERROR_COPY, type ParseSummary, type WorkerIn, type WorkerOut } from "./worker-protocol";
import { SetupChoice } from "./steps/SetupChoice";
import { buildFindings, type Findings } from "./findings";
import { jitter, paced, sleep } from "./pacing";
import "./analyze-flow.css";

type Step = "focus" | "platform" | "input" | "identify" | "analyzing";
const STEP_INDEX: Record<Step, number> = { focus: 0, platform: 1, input: 2, identify: 3, analyzing: 4 };
const MAX_FILE_BYTES = 50 * 1024 * 1024;
/**
 * 分析页每个阶段停留的基准时长（毫秒，实际带 ±20% 抖动）。
 * 本地计算一次就完成；这里按节奏逐条揭晓真实发现，总计约 10–12 秒，
 * 最后的 "writing" 阶段挂在真实的保存请求上。
 */
const STAGE_MS = { parsing: 1700, sessions: 1800, trends: 2200, turning: 2000, evidence: 2000, writing: 1400 } as const;

type Analysis = Extract<WorkerOut, { type: "analyzed" }>["analysis"];
type Intake = { label: string; summary: ParseSummary | null };

export function AnalyzeFlow({ initialQuestion, initialPlatform }: { initialQuestion: QuestionId | null; initialPlatform: ChatPlatformId }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("focus");
  const [question, setQuestion] = useState<QuestionId>(initialQuestion ?? DEFAULT_QUESTION);
  const [platform, setPlatform] = useState<ChatPlatformId>(initialPlatform);
  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("parsing");
  const [uploadFailed, setUploadFailed] = useState(false);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [findings, setFindings] = useState<Findings | null>(null);
  const pair = useRef<{ you: string; him: string } | null>(null);
  const lastAnalysis = useRef<Analysis | null>(null);
  const runId = useRef(0);

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
      if (!worker.current) {
        resolve({ type: "error", code: "unknown" });
        return;
      }
      pending.current = resolve;
      worker.current.postMessage(msg, transfer ?? []);
    });
  }, []);

  const handleParsed = (res: WorkerOut) => {
    if (res.type === "parsed") {
      setSummary(res.summary);
      setIntake((cur) => cur && { ...cur, summary: res.summary });
      track("upload_parsed", {
        messages: res.summary.messageCount,
        participants: res.summary.participants.length,
        lite: !res.summary.hadTimestamps,
      });
    } else if (res.type === "error") {
      setIntake(null);
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
    setStep("input");
    setIntake({ label: file.name, summary: null });
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      handleParsed(await call({ type: "parseFile", name: file.name, buf }, [buf]));
    } catch {
      setIntake(null);
      setError("We couldn't read that file. Try exporting the chat again, without media.");
    } finally {
      setBusy(false);
    }
  };

  // 落地页上已经选好文件：直接接着解析，用户落在"哪个是你"这一步。
  // 延迟到当前挂载稳定后再取出，避免开发模式 StrictMode 的首次试运行提前消费内容。
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const handoff = takePendingChat();
      if (handoff?.kind === "file") void onFile(handoff.file);
      if (handoff?.kind === "text") void onPaste(handoff.text);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPaste = async (text: string) => {
    setError(null);
    setStep("input");
    setIntake({ label: "Pasted text", summary: null });
    setBusy(true);
    try {
      handleParsed(await call({ type: "parseText", text }));
    } catch {
      setIntake(null);
      setError("We couldn't read that text. Check the format and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onDateOrder = async (dateOrder: "MDY" | "DMY") => {
    setBusy(true);
    try {
      const res = await call({ type: "reparse", dateOrder });
      if (res.type === "parsed") {
        setSummary(res.summary);
        setIntake((cur) => cur && { ...cur, summary: res.summary });
      }
      else if (res.type === "error") setError(ERROR_COPY[res.code]);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (analysis: Analysis) => {
    const { you, him } = pair.current!;
    const payload = buildUpload(analysis, { question, youName: you, himName: him });
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`upload failed: ${res.status}`);
    return (await res.json()) as { id: string; token: string };
  };

  /** 等保存完成（且最后一段至少停留片刻）后跳到报告；失败则显示重试。 */
  const finish = async (run: number, saving: Promise<{ id: string; token: string }>) => {
    setStage("writing");
    try {
      const [created] = await Promise.all([saving, sleep(paced(jitter(STAGE_MS.writing)))]);
      if (run !== runId.current) return;
      setStage("done");
      saveToken(created.id, created.token);
      track("report_created", { q: question }, created.id);
      await sleep(paced(500));
      router.push(`/r/${created.id}#t=${created.token}`);
    } catch {
      if (run === runId.current) setUploadFailed(true);
    }
  };

  const onAnalyze = async (you: string, him: string) => {
    const run = ++runId.current;
    setError(null);
    setUploadFailed(false);
    setFindings(null);
    pair.current = { you, him };
    setStep("analyzing");
    setStage("parsing");
    const started = Date.now();

    const res = await call({ type: "analyze", youName: you, himName: him });
    if (res.type !== "analyzed") {
      setError(res.type === "error" ? ERROR_COPY[res.code] : "We couldn't finish the analysis. Try again.");
      setStep("identify");
      return;
    }
    lastAnalysis.current = res.analysis;
    // 保存请求立刻发出，与揭晓动画并行。
    const saving = upload(res.analysis);
    saving.catch(() => {});
    setFindings(buildFindings(res.analysis, him));

    // 结果已全部算好，按节奏逐条揭晓。
    await sleep(Math.max(0, paced(jitter(STAGE_MS.parsing)) - (Date.now() - started)));
    for (const s of ["sessions", "trends", "turning", "evidence"] as const) {
      if (run !== runId.current) return;
      setStage(s);
      await sleep(paced(jitter(STAGE_MS[s])));
    }
    if (run !== runId.current) return;
    await finish(run, saving);
  };

  const onRetry = () => {
    if (!lastAnalysis.current) return;
    const run = ++runId.current;
    setUploadFailed(false);
    void finish(run, upload(lastAnalysis.current));
  };

  const back = () => {
    setError(null);
    if (step === "identify") setStep("input");
    if (step === "input") setStep("platform");
    if (step === "platform") setStep("focus");
  };

  return (
    <main className="v3-setup" aria-busy={busy || step === "analyzing"}>
      {step !== "analyzing" && (
        <div className="v3-setup-progress">
          {step !== "focus" ? (
            <button onClick={back} disabled={busy} className="flow-back inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeftIcon /> Back
            </button>
          ) : (
            <span />
          )}
          <ol className="v3-step-dots" aria-label={`Step ${STEP_INDEX[step] + 1} of 4`}>
            {["Your question", "Chat source", "Add your chat", "Identify people"].map((label, i) => (
              <li
                key={i}
                aria-current={i === STEP_INDEX[step] ? "step" : undefined}
                className={i <= STEP_INDEX[step] ? "is-complete" : ""}
              ><span className="sr-only">{label}</span></li>
            ))}
          </ol>
          <span>{STEP_INDEX[step] + 1} of 4</span>
        </div>
      )}

      {error && step !== "analyzing" && (
        <p role="alert" className="mb-5 rounded-2xl border border-rose/25 bg-rose-soft px-4 py-3 text-sm text-rose-dark">
          {error}
        </p>
      )}

      {step === "focus" && <SetupChoice kind="focus" question={question} platform={platform} onQuestion={setQuestion} onPlatform={setPlatform} onContinue={() => { track("question_selected", { q: question }); setStep("platform"); }} />}
      {step === "platform" && <SetupChoice kind="platform" question={question} platform={platform} onQuestion={setQuestion} onPlatform={setPlatform} onContinue={() => setStep("input")} />}
      <div hidden={step !== "input"}>
        <InputStep
          key={platform}
          busy={busy}
          onFile={onFile}
          onPaste={onPaste}
          initialPlatform={platform}
          intake={intake}
          onContinue={() => setStep("identify")}
          onReset={() => {
            setIntake(null);
            setSummary(null);
          }}
        />
      </div>

      {step === "identify" && summary && (
        <IdentifyStep summary={summary} busy={busy} onDateOrder={onDateOrder} onConfirm={onAnalyze} />
      )}

      {step === "analyzing" && (
        <AnalyzingStep
          stage={stage}
          findings={findings}
          failed={uploadFailed}
          onRetry={onRetry}
        />
      )}
    </main>
  );
}
