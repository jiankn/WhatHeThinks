"use client";

/**
 * 报告页：读取 #t= token → 拉取报告 → 未付费显示预览 + 付费墙，已付费显示完整报告。
 * 详见 docs/PRD.md §5.4–5.7。
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrashIcon } from "@/components/icons";
import { FullReportView } from "@/components/report/FullReportView";
import { Paywall } from "@/components/report/Paywall";
import { PreviewSection } from "@/components/report/PreviewSection";
import { track } from "@/lib/events";
import { questionLabel } from "@/lib/questions";
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const token = useRef<string | null>(null);
  const tracked = useRef(false);

  const load = useCallback(async () => {
    if (!token.current) return setState({ kind: "missing" });
    try {
      const res = await fetch(`/api/reports/${id}`, { headers: { "x-report-token": token.current } });
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
    if (!sessionId || !token.current) {
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
    const res = await fetch(`/api/reports/${id}`, {
      method: "DELETE",
      headers: { "x-report-token": token.current ?? "" },
    });
    if (res.ok) {
      track("delete", {});
      clearToken(id);
      setState({ kind: "deleted" });
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
        body: "The link may be incomplete, or the report was deleted. Use the full link from your browser or your email — it contains the key after “#t=”.",
      },
      deleted: { title: "Report deleted.", body: "This report and its example messages have been permanently removed." },
      error: { title: "Something went wrong.", body: "We couldn't load your report. Refresh the page to try again." },
    }[state.kind];
    return (
      <Shell>
        <h1 className="font-display text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-muted">{copy.body}</p>
        <Link href="/analyze" className="btn-primary mt-6">
          Analyze a chat
        </Link>
      </Shell>
    );
  }

  const { view } = state;
  return (
    <Shell>
      <p className="eyebrow">You asked</p>
      <h1 className="mt-2 font-display text-3xl leading-tight font-semibold sm:text-4xl">
        “{questionLabel(view.question, view.customQuestion)}”
      </h1>

      <div className="mt-6">
        {view.paid && view.report ? (
          <FullReportView view={view} report={view.report} token={token.current ?? ""} />
        ) : view.paid ? (
          <Generating failed={view.status === "failed"} />
        ) : (
          <>
            <PreviewSection preview={view.preview} />
            <Paywall preview={view.preview} busy={checkoutBusy} error={checkoutError} onUnlock={unlock} />
            <p className="mt-8 text-center text-xs text-muted">
              Bookmark this page — the link is your key to this report.
            </p>
          </>
        )}
      </div>

      <div className="mt-12 border-t border-line pt-6 text-center">
        <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-rose-dark">
          <TrashIcon /> Delete this report and its data
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-10 sm:pt-12">{children}</main>;
}

function Generating({ failed }: { failed: boolean }) {
  if (failed) {
    return (
      <div className="card px-5 py-6">
        <h2 className="font-display text-2xl font-semibold">We couldn't finish your report.</h2>
        <p className="mt-2 text-muted">
          Your payment went through, but something failed while writing the report. We'll refund you automatically —
          or email us and we'll sort it out.
        </p>
      </div>
    );
  }
  return (
    <div className="card px-5 py-10 text-center" aria-live="polite">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-rose-soft border-t-rose" />
      <p className="mt-4 font-display text-xl font-semibold">Writing your full report…</p>
      <p className="mt-1 text-sm text-muted">This usually takes a few seconds.</p>
    </div>
  );
}
