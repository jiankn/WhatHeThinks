"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/events";

/**
 * 付费后可选地把报告保存到账户：不打断阅读，也不强制注册。
 * 未登录：去登录/注册，回来时带 ?save=1 自动保存；已登录：一键保存。
 */
export function SaveToAccount({ reportId, token, signedIn, saved: initiallySaved }: { reportId: string; token: string; signedIn: boolean; saved: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = `/r/${reportId}?save=1`;

  const save = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/reports/${reportId}/claim`, { method: "POST", headers: { "x-report-token": token } });
      if (r.status === 409) { setError("This report is already saved to a different account."); return; }
      if (!r.ok) throw new Error();
      setSaved(true);
      track("report_saved_to_account", {}, reportId);
    } catch { setError("Couldn’t save the report. Please try again."); }
    finally { setBusy(false); }
  }, [reportId, token]);

  // 从登录/注册回来：自动保存一次，并把 ?save=1 从地址栏去掉
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("save")) return;
    window.history.replaceState(null, "", `/r/${reportId}${window.location.hash}`);
    if (signedIn && !initiallySaved && token) void save();
  }, [reportId, signedIn, initiallySaved, token, save]);

  if (saved) return <aside className="reader-save is-saved" aria-live="polite"><strong>Saved to your account.</strong><p>Find it anytime under <Link href="/account">your reports</Link>, on any device.</p></aside>;
  return <aside className="reader-save">
    <strong>Keep this report in a free account</strong>
    <p>Open it on any device without the private link. Optional — your report stays available through the emailed link either way.</p>
    {signedIn
      ? <button type="button" className="btn-secondary" disabled={busy || !token} onClick={() => void save()}>{busy ? "Saving…" : "Save to my account"}</button>
      : <div className="v3-button-row">
          <Link href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} className="btn-secondary">Continue with Google</Link>
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="btn-secondary">Use email</Link>
        </div>}
    {error && <p role="alert" className="v3-error">{error}</p>}
  </aside>;
}
