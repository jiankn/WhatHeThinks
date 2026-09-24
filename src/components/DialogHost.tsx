"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * 全站对话框，替代浏览器自带的 confirm()/alert()。
 * 任意客户端代码直接 `await confirmDialog({...})`，无需 hook；
 * 布局里挂载一次 <DialogHost />，同一时间只显示一个，其余排队。
 */
export type DialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger：确认按钮为红色，用于删除等不可撤销操作。 */
  tone?: "default" | "danger";
};

type Request = DialogOptions & { kind: "confirm" | "alert"; resolve: (ok: boolean) => void };

let queue: Request[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const current = () => queue[0] ?? null;

function open(kind: Request["kind"], options: DialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    queue = [...queue, { ...options, kind, resolve }];
    emit();
  });
}

/** 返回 true 表示用户确认，false 表示取消或关闭。 */
export const confirmDialog = (options: DialogOptions) => open("confirm", options);

/** 仅有一个“知道了”按钮的提示框。 */
export const alertDialog = (options: DialogOptions) => open("alert", options).then(() => undefined);

function settle(ok: boolean) {
  const [head, ...rest] = queue;
  if (!head) return;
  queue = rest;
  emit();
  head.resolve(ok);
}

export function DialogHost() {
  const request = useSyncExternalStore(subscribe, current, () => null);
  const ref = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !request) return;
    setClosing(false);
    if (!dialog.open) dialog.showModal();
    // 危险操作默认聚焦“取消”，避免误按回车删除。
    (request.tone === "danger" && request.kind === "confirm" ? cancelRef : confirmRef).current?.focus();
  }, [request]);

  const close = (ok: boolean) => {
    if (closing) return;
    setClosing(true);
    const dialog = ref.current;
    const done = () => {
      dialog?.close();
      settle(ok);
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) done();
    else window.setTimeout(done, 140);
  };

  if (!request) return null;
  const danger = request.tone === "danger";

  return (
    <dialog
      ref={ref}
      className={`site-dialog${closing ? " is-closing" : ""}`}
      aria-labelledby="site-dialog-title"
      aria-describedby={request.message ? "site-dialog-message" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div className="site-dialog-body">
        {danger && (
          <span className="site-dialog-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </span>
        )}
        <h2 id="site-dialog-title" className="site-dialog-title">{request.title}</h2>
        {request.message && <p id="site-dialog-message" className="site-dialog-message">{request.message}</p>}
      </div>
      <div className="site-dialog-actions">
        {request.kind === "confirm" && (
          <button ref={cancelRef} type="button" className="site-dialog-button" onClick={() => close(false)}>
            {request.cancelLabel ?? "Cancel"}
          </button>
        )}
        <button
          ref={confirmRef}
          type="button"
          className={`site-dialog-button ${danger ? "is-danger" : "is-primary"}`}
          onClick={() => close(true)}
        >
          {request.confirmLabel ?? (request.kind === "alert" ? "OK" : "Confirm")}
        </button>
      </div>
    </dialog>
  );
}
