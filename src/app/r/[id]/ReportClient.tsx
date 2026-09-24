"use client";

/**
 * 报告页：读取 #t= token → 拉取报告 → 未付费显示预览 + 付费墙，已付费显示完整报告。
 * 详见 docs/PRD.md §5.4–5.7。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrashIcon } from "@/components/icons";
import { FocusPicker } from "@/components/report/FocusPicker";
import { FullReportView } from "@/components/report/FullReportView";
import { Paywall } from "@/components/report/Paywall";
import { PreviewHeading, PreviewSection } from "@/components/report/PreviewSection";
import { PreviewTeaser } from "@/components/report/PreviewTeaser";
import { ShareResult } from "@/components/report/ShareResult";
import { track } from "@/lib/events";
import { clearToken, tokenFromHash } from "@/lib/report/token-store";
import type { ReportView } from "@/lib/report/view";

type State =
  | { kind: "loading" }
  | { kind: "confirming" }
  | { kind: "missing" }
  | { kind: "deleted" }
  | { kind: "error" }
  | { kind: "ok"; view: ReportView };

export function ReportClient({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [focusReady, setFocusReady] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const token = useRef<string | null>(null);
  const tracked = useRef(false);

  const load = useCallback(async () => {
    try {
      const headers = token.current ? { "x-report-token": token.current } : undefined;
      const res = await fetch(`/api/reports/${id}`, { headers });
      if (res.status === 404) return setState({ kind: "missing" });
      if (!res.ok) return setState({ kind: "error" });
      const view = (await res.json()) as ReportView;
      setState({ kind: "ok", view });
      if (!tracked.current) {
        tracked.current = true;
        track("preview_view", { paid: view.paid, lite: view.preview.liteMode }, id);
      }
    } catch {
      setState({ kind: "error" });
    }
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    token.current = tokenFromHash(id);
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      void load();
      return;
    }
    // Stripe 支付回跳：先向服务器确认付款，再加载报告，并把 session_id 从地址栏去掉
    setState({ kind: "confirming" });
    void (async () => {
      await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "content-type": "application/json", "x-report-token": token.current ?? "" },
        body: JSON.stringify({ reportId: id, sessionId }),
      }).catch(() => null);
      window.history.replaceState(null, "", `/r/${id}`);
      await load();
    })();
  }, [id, load]);

  // 已付费但报告仍在生成：轮询。
  const generating = state.kind === "ok" && state.view.paid && state.view.status !== "ready" && state.view.status !== "failed";
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [generating, load]);

  const unlock = async () => {
    if (!focusReady) { setCheckoutError("Save your report focus before continuing."); return; }
    setCheckoutBusy(true);
    setCheckoutError(null);
    track("checkout_click", {}, id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "x-report-token": token.current ?? "" },
        body: JSON.stringify({ reportId: id }),
      });
      const data = (await res.json()) as { url?: string; unlocked?: boolean; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.unlocked) {
        await load();
      } else {
        setCheckoutError("Checkout isn't available right now. Please try again in a minute.");
      }
    } catch {
      setCheckoutError("Couldn't reach checkout. Check your connection and try again.");
    }
    setCheckoutBusy(false);
  };

  const remove = async () => {
    if (!confirm("Delete this report and all of its data? This can't be undone.")) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
        headers: { "x-report-token": token.current ?? "" },
      });
      if (!res.ok) throw new Error("delete failed");
      track("delete", {});
      clearToken(id);
      setState({ kind: "deleted" });
    } catch {
      setDeleteError("We couldn't delete the report. Check your connection and try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (state.kind === "confirming") {
    return (
      <Shell>
        <div className="card px-5 py-10 text-center" aria-live="polite">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-rose-soft border-t-rose" />
          <p className="mt-4 font-display text-xl font-semibold">Confirming your payment…</p>
          <p className="mt-1 text-sm text-muted">Your full report will open in a moment.</p>
        </div>
      </Shell>
    );
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <div className="space-y-4" aria-busy>
          <div className="h-6 w-1/2 animate-pulse rounded bg-line" />
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-line/60" />
          <div className="h-32 animate-pulse rounded-[var(--radius-card)] bg-line/60" />
        </div>
      </Shell>
    );
  }

  if (state.kind !== "ok") {
    const copy = {
      missing: {
        title: "We can't open this report.",
        body: "The link may be incomplete, the report was deleted, or it belongs to another account. Sign in or use the full private link from your email.",
      },
      deleted: { title: "Report deleted.", body: "This report and its example messages have been permanently removed." },
      error: { title: "Something went wrong.", body: "We couldn't load your report. Refresh the page to try again." },
    }[state.kind];
    return (
      <Shell>
        <h1 className="font-display text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-muted">{copy.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {state.kind === "error" && <button type="button" className="btn-primary" onClick={() => void load()}>Try again</button>}
          {state.kind === "missing" && <Link href="/find-report" className="btn-primary">Email me my report links</Link>}
          <Link href={state.kind === "deleted" ? "/" : "/analyze"} className={state.kind === "deleted" ? "btn-primary" : "btn-secondary"}>
            {state.kind === "deleted" ? "Go home" : "Analyze a chat"}
          </Link>
        </div>
      </Shell>
    );
  }

  const { view } = state;
  if (view.paid && view.report) return <FullReportView view={view} report={view.report} token={token.current ?? ""} onDelete={remove} deleteBusy={deleteBusy} deleteError={deleteError} />;
  return (
    <Shell>
      <PreviewHeading preview={view.preview} />

      <div>
        {view.paid ? (
          <Generating failed={view.status === "failed"} />
        ) : (
          <>
            <PreviewTeaser reportId={id} token={token.current ?? ""} />
            <PreviewSection preview={view.preview} />
            <details className="reader-details"><summary>Change what your full report focuses on</summary><FocusPicker
              reportId={id}
              token={token.current ?? ""}
              preview={view.preview}
              question={view.question}
              customQuestion={view.customQuestion}
              onReadyChange={setFocusReady}
              onSaved={(question, customQuestion) => setState(current => current.kind === "ok" ? { ...current, view: { ...current.view, question, customQuestion } } : current)}
            /></details>
            <Paywall preview={view.preview} question={view.question} busy={checkoutBusy} error={checkoutError} onUnlock={unlock} />
            <ShareResult preview={view.preview} reportId={id} token={token.current ?? ""} />
          </>
        )}
      </div>

      <div className="report-delete">
        <button type="button" onClick={remove} disabled={deleteBusy} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-rose-dark disabled:opacity-60">
          <TrashIcon /> {deleteBusy ? "Deleting…" : "Delete this report and its data"}
        </button>
      </div>
      {deleteError && <p role="alert" className="mt-2 text-center text-sm text-rose-dark">{deleteError}</p>}
      <p className="mt-4 text-center text-xs text-muted">Bookmark this page. The link is your key to this report.</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="reader-shell">{children}</main>;
}

function Generating({ failed }: { failed: boolean }) {
  if (failed) {
    return (
      <div className="card px-5 py-6">
        <h2 className="font-display text-2xl font-semibold">We couldn't finish your report.</h2>
        <p className="mt-2 text-muted">
          Your payment went through, but something failed while writing the report. You'll receive an automatic full
          refund. If you need help, email support@whathethinks.com.
        </p>
        <Link href="/analyze" className="btn-secondary mt-4">Start a new free preview</Link>
      </div>
    );
  }
  return (
    <div className="card px-5 py-10 text-center" aria-live="polite">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-rose-soft border-t-rose" />
      <p className="mt-4 font-display text-xl font-semibold">Writing your full report…</p>
      <p className="mt-1 text-sm text-muted">We’re checking the evidence and writing your report in English. This may take up to two minutes.</p>
    </div>
  );
}
