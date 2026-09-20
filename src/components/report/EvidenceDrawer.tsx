"use client";

/**
 * "View evidence" 抽屉：展示某条结论引用的原始消息摘录（已脱敏）。
 * 手机上是底部抽屉，桌面上居中弹窗。Esc / 点击遮罩关闭。
 */

import { useEffect, useRef } from "react";
import type { EvidenceMsg } from "@/lib/analysis/analysis-types";
import { fmtDateLong, fmtDateTime } from "@/lib/format";

export function EvidenceDrawer({
  title,
  messages,
  expired,
  splitAt,
  onClose,
}: {
  title: string;
  messages: EvidenceMsg[];
  expired: boolean;
  /** 转折点日期：在该时间处插入分隔线，区分变化前后。 */
  splitAt?: number;
  onClose: () => void;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = dialog.current?.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), a[href], input, select, textarea, [tabindex="0"]');
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div ref={dialog} className="evidence-dialog fixed inset-0 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-labelledby="evidence-title">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[var(--radius-card)] bg-paper shadow-2xl sm:rounded-[var(--radius-card)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="eyebrow">The receipts</p>
            <h3 id="evidence-title" className="mt-1 font-medium">
              {title}
            </h3>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted hover:bg-line/60 hover:text-ink">
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          {messages.length ? (
            <ol className="space-y-3">
              {messages.map((m, i) => {
                const mine = m.sender === "Y";
                const divider =
                  splitAt !== undefined && m.ts >= splitAt && (i === 0 || messages[i - 1].ts < splitAt);
                return (
                  <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {divider && (
                      <span className="my-2 flex w-full items-center gap-3 text-xs font-medium tracking-wide text-rose uppercase">
                        <span className="h-px flex-1 bg-rose/30" />
                        Around {fmtDateLong(splitAt)}
                        <span className="h-px flex-1 bg-rose/30" />
                      </span>
                    )}
                    <span className="mb-1 px-1 text-xs text-faint">
                      {mine ? "You" : "Him"} · {fmtDateTime(m.ts)}
                    </span>
                    <span
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap ${
                        mine ? "rounded-br-md bg-you-soft" : "rounded-bl-md bg-card ring-1 ring-line"
                      }`}
                    >
                      {m.text}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              {expired
                ? "Example messages are automatically deleted 30 days after your report was created, for your privacy. The findings above are unchanged."
                : "This finding is based on counts across the whole chat rather than specific messages."}
            </p>
          )}
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">
          Names, emails, phone numbers and links are replaced before anything leaves your device.
        </p>
      </div>
    </div>
  );
}
