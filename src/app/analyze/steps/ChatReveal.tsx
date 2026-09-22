"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, MessageIcon } from "@/components/icons";
import { fmtInt, fmtRange } from "@/lib/format";
import { paced, signalFor } from "../pacing";
import type { ParseSummary } from "../worker-protocol";

type Phase = "opening" | "counting" | "details" | "signal" | "ready";

/** 背景里往上飘的聊天气泡剪影：左右交替、宽度不一，只是形状，不含任何内容。 */
const BUBBLES = [62, 38, 70, 46, 30, 58, 74, 40, 52, 34, 66, 44, 56, 36];

/**
 * 读取聊天时的揭晓动画：打开 → 消息数滚动计数 → 日期与名字 → 信号强度。
 * 停在结果上，由用户点 Continue 进入下一步。
 * 挂载时如果已经有结果（比如从下一步返回），直接显示最终状态。
 */
export function ChatReveal({
  label,
  summary,
  onContinue,
  onReset,
}: {
  label: string;
  summary: ParseSummary | null;
  onContinue: () => void;
  onReset: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(summary ? "ready" : "opening");
  const [shown, setShown] = useState(summary?.messageCount ?? 0);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    if (!summary || phase !== "opening") return;
    const total = summary.messageCount;
    const signal = signalFor(total);
    const countMs = paced(Math.min(2000, Math.max(1000, 900 + 300 * Math.log10(Math.max(10, total)))));
    const start = Math.max(0, paced(900) - (Date.now() - openedAt.current));
    const barsMs = signal.bars * paced(220);

    let raf = 0;
    const timers = [
      window.setTimeout(() => {
        setPhase("counting");
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / countMs);
          setShown(Math.round(total * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, start),
      window.setTimeout(() => setPhase("details"), start + countMs + paced(150)),
      window.setTimeout(() => setPhase("signal"), start + countMs + paced(850)),
      window.setTimeout(() => setPhase("ready"), start + countMs + paced(850) + barsMs + paced(450)),
    ];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
    // 只在结果到达时排一次时间线。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  const signal = summary ? signalFor(summary.messageCount) : null;
  const names = summary?.participants.slice(0, 2).map((p) => p.name) ?? [];
  const reached = (p: Phase) => {
    const order: Phase[] = ["opening", "counting", "details", "signal", "ready"];
    return order.indexOf(phase) >= order.indexOf(p);
  };

  return (
    <div className="chat-reveal-wrap">
      <div className="chat-reveal" data-phase={phase} aria-busy={phase !== "ready"}>
        <div className="chat-reveal-stream" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="chat-reveal-stream-set">
              {BUBBLES.map((w, i) => (
                <span key={i} className={i % 3 === 1 ? "is-right" : ""} style={{ width: `${w}%` }} />
              ))}
            </div>
          ))}
        </div>
        <div className="chat-reveal-scan" aria-hidden="true" />

        <div className="chat-reveal-body">
          {phase === "opening" ? (
            <>
              <span className="chat-reveal-spinner" aria-hidden="true" />
              <p className="chat-reveal-title">Opening your chat…</p>
              <p className="chat-reveal-file">{label}</p>
            </>
          ) : (
            <>
              <p className="chat-reveal-count num">
                {fmtInt(shown)} <MessageIcon className="h-8 w-8" />
              </p>
              <p className="chat-reveal-caption">{reached("details") ? "messages read" : "reading messages…"}</p>
              <p className={`chat-reveal-meta ${reached("details") ? "is-in" : ""}`}>
                {names.join(" & ")}
                {summary?.range && summary.hadTimestamps && <> · <span className="num">{fmtRange(summary.range)}</span></>}
              </p>
              {signal && (
                <p className={`chat-reveal-signal ${reached("signal") ? "is-in" : ""}`}>
                  <span className="chat-reveal-bars" aria-hidden="true">
                    {[1, 2, 3, 4].map((b) => (
                      <i key={b} className={reached("signal") && b <= signal.bars ? "is-lit" : ""} style={{ transitionDelay: `${(b - 1) * paced(220)}ms` }} />
                    ))}
                  </span>
                  {signal.label}
                </p>
              )}
            </>
          )}
        </div>
        {signal && <p className={`chat-reveal-hint ${phase === "ready" ? "is-in" : ""}`}>{signal.hint}</p>}
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "ready" && summary && signal ? `Read ${fmtInt(summary.messageCount)} messages. ${signal.label}.` : ""}
      </p>

      {summary && !summary.hadTimestamps && phase === "ready" && (
        <p className="chat-reveal-note">No timestamps found, so reply-time and week-by-week patterns will be limited.</p>
      )}

      <div className={`chat-reveal-actions ${phase === "ready" ? "is-in" : ""}`}>
        <button className="btn-primary v3-next" disabled={phase !== "ready"} onClick={onContinue}>
          Continue <ArrowRightIcon className="v3-next-icon" />
        </button>
        <button className="chat-reveal-reset" disabled={phase !== "ready"} onClick={onReset}>
          Use a different chat
        </button>
      </div>
    </div>
  );
}
