"use client";

/**
 * 免费工具组件：上传 → 选"哪个是你" → 一句话答案 + 按月趋势。
 * 复用 /analyze 的 Web Worker；全程在浏览器内完成，不上传任何数据。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, LockIcon } from "@/components/icons";
import { SplitBar } from "@/components/report/SplitBar";
import { ChatDropzone } from "@/components/upload/ChatDropzone";
import { ExportHelp } from "@/components/upload/ExportHelp";
import type { Analysis } from "@/lib/analysis/analysis-types";
import { track } from "@/lib/events";
import { fmtMinutes, fmtPct } from "@/lib/format";
import { ERROR_COPY, type ParseSummary, type WorkerIn, type WorkerOut } from "@/app/analyze/worker-protocol";

type Tool = "who-texts-first" | "reply-time";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** 按月趋势只展示最近 12 个月，长聊天也不会拉出一长串。 */
const MAX_MONTHS = 12;

interface MonthRow {
  month: string;
  yInit: number;
  hInit: number;
  hReply: number | null;
}

/** 周桶 → 月度汇总（发起次数求和；回复时间取各周中位数的均值）。 */
function byMonth(a: Analysis): MonthRow[] {
  const map = new Map<string, { yI: number; hI: number; hR: number[] }>();
  for (const w of a.weeks) {
    const key = new Date(w.weekStart).toISOString().slice(0, 7);
    const m = map.get(key) ?? { yI: 0, hI: 0, hR: [] };
    m.yI += w.Y.initiations;
    m.hI += w.H.initiations;
    if (w.H.replyP50 > 0) m.hR.push(w.H.replyP50);
    map.set(key, m);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return [...map.entries()].slice(-MAX_MONTHS).map(([k, m]) => ({
    month: new Date(`${k}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
    yInit: m.yI,
    hInit: m.hI,
    hReply: avg(m.hR),
  }));
}

const hasReply = (x: number) => Number.isFinite(x) && x > 0;

export function ToolWidget({ tool }: { tool: Tool }) {
  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const worker = useRef<Worker | null>(null);
  const pending = useRef<((m: WorkerOut) => void) | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../../app/analyze/analyze.worker.ts", import.meta.url));
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      pending.current?.(e.data);
      pending.current = null;
    };
    w.onerror = () => {
      pending.current?.({ type: "error", code: "unknown" });
      pending.current = null;
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  const call = useCallback(
    (msg: WorkerIn, transfer?: Transferable[]) =>
      new Promise<WorkerOut>((resolve) => {
        if (!worker.current) {
          resolve({ type: "error", code: "unknown" });
          return;
        }
        pending.current = resolve;
        worker.current.postMessage(msg, transfer ?? []);
      }),
    [],
  );

  const onParsed = (res: WorkerOut) => {
    if (res.type === "error") return setError(ERROR_COPY[res.code]);
    if (res.type !== "parsed") return;
    if (!res.summary.hadTimestamps) {
      return setError("This tool needs timestamps. Upload a WhatsApp export (.txt or .zip) instead of plain text.");
    }
    setSummary(res.summary);
  };

  const onFile = async (f: File) => {
    setError(null);
    if (f.size > MAX_FILE_BYTES) {
      setError("That file is over 50 MB. Export the chat without media and try again.");
      return;
    }
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      onParsed(await call({ type: "parseFile", name: f.name, buf }, [buf]));
    } catch {
      setError("We couldn't read that file. Export the chat again without media, then retry.");
    } finally {
      setBusy(false);
    }
  };

  const onPaste = async () => {
    setError(null);
    setBusy(true);
    try {
      onParsed(await call({ type: "parseText", text }));
    } catch {
      setError("We couldn't read that text. Check the format and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (you: string) => {
    const him = summary!.participants.find((p) => p.name !== you)?.name;
    if (!him) return;
    setBusy(true);
    try {
      const res = await call({ type: "analyze", youName: you, himName: him });
      if (res.type === "error") return setError(ERROR_COPY[res.code]);
      if (res.type === "analyzed") {
        setResult(res.analysis);
        track("tool_used", { tool });
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSummary(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="card px-5 py-6 sm:px-6">
      {error && (
        <p role="alert" className="mb-4 rounded-2xl border border-rose/25 bg-rose-soft px-4 py-3 text-sm text-rose-dark">
          {error}
        </p>
      )}

      {!summary && !result && (
        <>
          {paste ? (
            <div className="space-y-3">
              <textarea
                aria-label="Paste an exported WhatsApp chat"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={"[5/18/25, 9:41:05 PM] Jake: hey you\n[5/18/25, 9:43:10 PM] Emma: hiii"}
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 font-mono text-sm outline-none focus:border-rose"
              />
              <button type="button" className="btn-primary w-full" disabled={busy || text.trim().length < 20} onClick={onPaste}>
                {busy ? "Reading…" : "Calculate"}
              </button>
            </div>
          ) : (
            <ChatDropzone busy={busy} onFile={onFile} />
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <LockIcon className="h-3.5 w-3.5" /> Runs on your device. Nothing is uploaded.
            </span>
            <button type="button" onClick={() => setPaste((v) => !v)} className="inline-flex min-h-11 shrink-0 items-center underline underline-offset-2 hover:text-ink">
              {paste ? "Upload a file" : "Paste instead"}
            </button>
          </div>

          <ExportHelp />
        </>
      )}

      {summary && !result && (
        <div>
          <p className="font-semibold">Which one is you?</p>
          {summary.participants.length > 2 ? (
            <div className="mt-3 rounded-[var(--radius-card)] bg-rose-soft px-4 py-4">
              <p className="text-sm text-muted">This free tool is for one-to-one chats. The full analyzer lets you choose any two people from a group chat.</p>
              <Link href="/analyze" className="text-link mt-3">Open the full analyzer <ArrowRightIcon /></Link>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {summary.participants.map((p) => (
                <button type="button" key={p.name} disabled={busy} onClick={() => pick(p.name)} className="rounded-2xl border border-line bg-paper px-4 py-3 text-left transition hover:border-you">
                  <span className="font-medium">{p.name}</span>
                  <span className="num ml-2 text-sm text-muted">{p.count.toLocaleString("en-US")} msgs</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={reset} className="mt-4 inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-ink">
            Use a different chat
          </button>
        </div>
      )}

      {result && <Result tool={tool} a={result} onReset={reset} />}
    </div>
  );
}

function Result({ tool, a, onReset }: { tool: Tool; a: Analysis; onReset: () => void }) {
  const months = byMonth(a);
  const { Y, H } = a.totals;
  const convos = Y.initiations + H.initiations;
  const hisShare = convos ? H.initiations / convos : 0.5;
  const hisReply = hasReply(H.replyP50) ? fmtMinutes(H.replyP50) : null;

  // 顺带给出另一个指标：数据已在手，不必让用户再去另一个工具重传一次。
  const alsoInitiation = convos ? `he starts ${fmtPct(hisShare)} of your conversations.` : null;
  const alsoReply = hisReply ? `he usually replies in ${hisReply}.` : null;

  return (
    <div className="space-y-6">
      {tool === "who-texts-first" ? (
        <>
          <div>
            <p className="font-display text-3xl leading-tight font-semibold">
              {!convos
                ? "Not enough conversations yet."
                : hisShare < 0.4
                  ? "You text first more often."
                  : hisShare > 0.6
                    ? "He texts first more often."
                    : "You take turns texting first."}
            </p>
            {convos > 0 && (
              <p className="mt-2 text-muted">
                He started <span className="num text-ink">{fmtPct(hisShare)}</span> of your{" "}
                <span className="num text-ink">{convos.toLocaleString("en-US")}</span> conversations.
              </p>
            )}
          </div>
          {convos > 0 && <SplitBar label="Who starts conversations" you={Y.initiations} him={H.initiations} />}
          {months.length > 1 && (
            <div>
              <p className="text-sm font-medium">How often he texts first, by month</p>
              <ul className="mt-2 space-y-2">
                {months.map((m) => {
                  const tot = m.yInit + m.hInit;
                  const h = tot ? m.hInit / tot : 0;
                  return (
                    <li key={m.month} className="grid grid-cols-[3.75rem_1fr_2.75rem] items-center gap-3 text-sm">
                      <span className="num text-muted">{m.month}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-him" style={{ width: `${h * 100}%` }} />
                      </span>
                      <span className="num text-right text-muted">{tot ? fmtPct(h) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {alsoReply && <p className="text-sm text-muted">Also in this chat: {alsoReply}</p>}
        </>
      ) : (
        <ReplyResult a={a} months={months} also={alsoInitiation} />
      )}

      <div className="rounded-2xl bg-plum px-5 py-5 text-paper">
        <p className="font-display text-xl">One number doesn&apos;t tell you why.</p>
        <p className="mt-1 text-sm text-paper/75">
          {a.preview.headline ? "We spotted a change in this chat. " : ""}
          The full analysis finds the week things changed and shows the messages behind it.
        </p>
        <Link
          href={tool === "who-texts-first" ? "/analyze?q=more_invested" : "/analyze?q=losing_interest"}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink"
        >
          See the full picture <ArrowRightIcon />
        </Link>
      </div>
      <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-ink">
        Try another chat
      </button>
    </div>
  );
}

function ReplyResult({ a, months, also }: { a: Analysis; months: MonthRow[]; also: string | null }) {
  const { Y, H } = a.totals;
  const maxReply = Math.max(0, ...months.map((m) => m.hReply ?? 0));

  if (!hasReply(H.replyP50)) {
    return <p className="font-display text-3xl leading-tight font-semibold">Not enough replies from him to measure yet.</p>;
  }

  return (
    <>
      <div>
        <p className="font-display text-3xl leading-tight font-semibold">
          He usually replies in <span className="num text-him">{fmtMinutes(H.replyP50)}</span>.
        </p>
        <p className="mt-2 text-muted">
          You usually reply in <span className="num text-ink">{hasReply(Y.replyP50) ? fmtMinutes(Y.replyP50) : "—"}</span>.
          {hasReply(H.replyP90) && (
            <>
              {" "}1 in 10 of his replies takes longer than <span className="num text-ink">{fmtMinutes(H.replyP90)}</span>.
            </>
          )}
        </p>
      </div>
      {months.length > 1 && (
        <div>
          <p className="text-sm font-medium">His typical reply time, by month</p>
          <ul className="mt-2 space-y-2">
            {months.map((m) => (
              <li key={m.month} className="grid grid-cols-[3.75rem_1fr_4.5rem] items-center gap-3 text-sm">
                <span className="num text-muted">{m.month}</span>
                <span className="h-2 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-him" style={{ width: `${m.hReply && maxReply ? (m.hReply / maxReply) * 100 : 0}%` }} />
                </span>
                <span className="num text-right text-muted">{m.hReply === null ? "—" : fmtMinutes(m.hReply)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Longer bar = slower replies. Gaps of 6+ hours don&apos;t count as a reply.</p>
        </div>
      )}
      {also && <p className="text-sm text-muted">Also in this chat: {also}</p>}
    </>
  );
}
