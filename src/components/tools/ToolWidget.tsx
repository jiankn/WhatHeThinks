"use client";

/**
 * 免费工具组件：上传/粘贴 → 选"哪个是你" → 只展示一个指标（按月拆分）。
 * 复用 /analyze 的 Web Worker；全程在浏览器内完成，不上传任何数据。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, LockIcon, UploadIcon } from "@/components/icons";
import { SplitBar } from "@/components/report/SplitBar";
import type { Analysis } from "@/lib/analysis/analysis-types";
import { track } from "@/lib/events";
import { fmtMinutes, fmtPct } from "@/lib/format";
import { ERROR_COPY, type ParseSummary, type WorkerIn, type WorkerOut } from "@/app/analyze/worker-protocol";

type Tool = "who-texts-first" | "reply-time";

interface MonthRow {
  month: string;
  yInit: number;
  hInit: number;
  yReply: number | null;
  hReply: number | null;
}

/** 周桶 → 月度汇总（发起次数求和；回复时间取各周中位数的均值）。 */
function byMonth(a: Analysis): MonthRow[] {
  const map = new Map<string, { yI: number; hI: number; yR: number[]; hR: number[] }>();
  for (const w of a.weeks) {
    const key = new Date(w.weekStart).toISOString().slice(0, 7);
    const m = map.get(key) ?? { yI: 0, hI: 0, yR: [], hR: [] };
    m.yI += w.Y.initiations;
    m.hI += w.H.initiations;
    if (w.Y.replyP50 > 0) m.yR.push(w.Y.replyP50);
    if (w.H.replyP50 > 0) m.hR.push(w.H.replyP50);
    map.set(key, m);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return [...map.entries()].map(([k, m]) => ({
    month: new Date(`${k}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
    yInit: m.yI,
    hInit: m.hI,
    yReply: avg(m.yR),
    hReply: avg(m.hR),
  }));
}

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
    worker.current = w;
    return () => w.terminate();
  }, []);

  const call = useCallback(
    (msg: WorkerIn, transfer?: Transferable[]) =>
      new Promise<WorkerOut>((resolve) => {
        pending.current = resolve;
        worker.current?.postMessage(msg, transfer ?? []);
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
    setBusy(true);
    const buf = await f.arrayBuffer();
    onParsed(await call({ type: "parseFile", name: f.name, buf }, [buf]));
    setBusy(false);
  };

  const onPaste = async () => {
    setError(null);
    setBusy(true);
    onParsed(await call({ type: "parseText", text }));
    setBusy(false);
  };

  const pick = async (you: string) => {
    const him = summary!.participants.find((p) => p.name !== you)?.name;
    if (!him) return;
    setBusy(true);
    const res = await call({ type: "analyze", youName: you, himName: him });
    setBusy(false);
    if (res.type === "error") return setError(ERROR_COPY[res.code]);
    if (res.type === "analyzed") {
      setResult(res.analysis);
      track("tool_used", { tool });
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
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder="Paste an exported WhatsApp chat…"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 font-mono text-sm outline-none focus:border-rose"
              />
              <button className="btn-primary w-full" disabled={busy || text.trim().length < 20} onClick={onPaste}>
                {busy ? "Reading…" : "Calculate"}
              </button>
            </div>
          ) : (
            <label className={`flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center transition hover:border-rose/50 ${busy ? "pointer-events-none opacity-60" : ""}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
                <UploadIcon />
              </span>
              <span className="mt-3 font-semibold">{busy ? "Reading your chat…" : "Upload your WhatsApp export"}</span>
              <span className="mt-1 text-sm text-muted">.txt or .zip</span>
              <input type="file" accept=".txt,.zip,text/plain,application/zip" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
          )}
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <LockIcon className="h-3.5 w-3.5" /> Runs entirely on your device. Nothing is uploaded.
            </span>
            <button onClick={() => setPaste((v) => !v)} className="shrink-0 underline underline-offset-2 hover:text-ink">
              {paste ? "Upload a file" : "Paste instead"}
            </button>
          </div>
        </>
      )}

      {summary && !result && (
        <div>
          <p className="font-semibold">Which one is you?</p>
          {summary.participants.length > 2 && (
            <p className="mt-1 text-sm text-muted">This tool compares two people — for group chats, use the full analyzer.</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {summary.participants.slice(0, 2).map((p) => (
              <button key={p.name} disabled={busy} onClick={() => pick(p.name)} className="rounded-2xl border border-line bg-paper px-4 py-3 text-left transition hover:border-you">
                <span className="font-medium">{p.name}</span>
                <span className="num ml-2 text-sm text-muted">{p.count.toLocaleString("en-US")} msgs</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && <Result tool={tool} a={result} onReset={reset} />}
    </div>
  );
}

function Result({ tool, a, onReset }: { tool: Tool; a: Analysis; onReset: () => void }) {
  const months = byMonth(a);
  const t = a.totals;

  return (
    <div className="space-y-6">
      {tool === "who-texts-first" ? (
        <>
          <SplitBar label="Who starts conversations" you={a.preview.initiation.you} him={a.preview.initiation.him} />
          <p className="text-sm text-muted">
            You started <span className="num text-ink">{t.Y.initiations}</span> conversations and he started{" "}
            <span className="num text-ink">{t.H.initiations}</span>. A new conversation starts after 6+ hours of silence.
          </p>
          {months.length > 1 && (
            <div>
              <p className="text-sm font-medium">By month</p>
              <ul className="mt-2 space-y-2">
                {months.map((m) => {
                  const tot = m.yInit + m.hInit;
                  const y = tot ? m.yInit / tot : 0.5;
                  return (
                    <li key={m.month} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3 text-sm">
                      <span className="num text-muted">{m.month}</span>
                      <span className="flex h-2 gap-0.5">
                        <span className="rounded-l-full bg-you" style={{ width: `${y * 100}%` }} />
                        <span className="rounded-r-full bg-him" style={{ width: `${(1 - y) * 100}%` }} />
                      </span>
                      <span className="num text-right text-xs text-muted">{tot ? `him ${fmtPct(1 - y)}` : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Reply time</th>
                <th className="pb-2 text-right font-medium text-you">You</th>
                <th className="pb-2 text-right font-medium text-him">Him</th>
              </tr>
            </thead>
            <tbody className="num">
              {(
                [
                  ["Typical (median)", t.Y.replyP50, t.H.replyP50],
                  ["Slower replies (75th pct)", t.Y.replyP75, t.H.replyP75],
                  ["Slowest 10% start at", t.Y.replyP90, t.H.replyP90],
                ] as const
              ).map(([l, y, h]) => (
                <tr key={l} className="border-t border-dashed border-line">
                  <td className="py-2 font-sans text-muted">{l}</td>
                  <td className="py-2 text-right font-semibold">{fmtMinutes(y)}</td>
                  <td className="py-2 text-right font-semibold">{fmtMinutes(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {months.length > 1 && (
            <div>
              <p className="text-sm font-medium">His typical reply time by month</p>
              <table className="mt-2 w-full text-sm">
                <tbody className="num">
                  {months.map((m) => (
                    <tr key={m.month} className="border-t border-line">
                      <td className="py-1.5 text-muted">{m.month}</td>
                      <td className="py-1.5 text-right">{m.hReply === null ? "—" : fmtMinutes(m.hReply)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="rounded-2xl bg-plum px-5 py-5 text-paper">
        <p className="font-display text-xl">Want to know if it's a pattern?</p>
        <p className="mt-1 text-sm text-paper/75">
          {a.preview.headline ? "We spotted a change in his behavior in this chat. " : ""}
          The full analysis finds the week his texting changed, checks for mixed signals and shows the messages behind it.
        </p>
        <Link href="/analyze?q=energy_changed" className="mt-4 inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink">
          See when it changed <ArrowRightIcon />
        </Link>
      </div>
      <button onClick={onReset} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
        Try another chat
      </button>
    </div>
  );
}
