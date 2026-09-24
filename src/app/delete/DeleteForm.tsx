"use client";

import { useState } from "react";
import { confirmDialog } from "@/components/DialogHost";
import { track } from "@/lib/events";
import { clearToken, loadToken } from "@/lib/report/token-store";

/** 从报告链接中解析 id 与 token（#t=）。 */
function parseLink(link: string): { id: string; token: string | null } | null {
  const m = /\/r\/([\w-]{12})/.exec(link);
  if (!m) return null;
  const hash = link.includes("#") ? link.slice(link.indexOf("#") + 1) : "";
  const token = new URLSearchParams(hash).get("t") ?? loadToken(m[1]);
  return { id: m[1], token };
}

export function DeleteForm() {
  const [link, setLink] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "notfound" | "invalid">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseLink(link.trim());
    if (!parsed || !parsed.token) return setState("invalid");
    const ok = await confirmDialog({
      title: "Delete this report?",
      message: "The report and all of its data will be permanently deleted. This can't be undone.",
      confirmLabel: "Delete report",
      tone: "danger",
    });
    if (!ok) return;
    setState("working");
    const res = await fetch(`/api/reports/${parsed.id}`, {
      method: "DELETE",
      headers: { "x-report-token": parsed.token },
    }).catch(() => null);
    if (res?.ok) {
      clearToken(parsed.id);
      track("delete", { from: "delete_page" });
      setState("done");
    } else setState("notfound");
  };

  if (state === "done") {
    return <p className="mt-6 rounded-2xl bg-ok/10 px-4 py-3 text-ok">Deleted. That report and its example messages are gone for good.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label htmlFor="link" className="text-sm font-medium">
        Your report link
      </label>
      <input
        id="link"
        type="url"
        inputMode="url"
        autoComplete="url"
        required
        value={link}
        onChange={(e) => {
          setLink(e.target.value);
          setState("idle");
        }}
        placeholder="https://whathethinks.com/r/…#t=…"
        aria-invalid={state === "invalid" || state === "notfound"}
        aria-describedby="report-link-help report-link-error"
        className="w-full rounded-2xl border border-line bg-card px-4 py-3 font-mono text-sm outline-none focus:border-rose"
      />
      <p id="report-link-help" className="text-sm text-muted">Use the full link from your browser or report email. It includes the key after “#t=”.</p>
      <div id="report-link-error" aria-live="polite">
        {state === "invalid" && <p className="text-sm text-rose-dark">That doesn't look like a complete report link.</p>}
        {state === "notfound" && <p className="text-sm text-rose-dark">We couldn't find a report for that link. It may already be deleted.</p>}
      </div>
      <button className="btn-primary w-full" disabled={!link.trim() || state === "working"}>
        {state === "working" ? "Deleting…" : "Delete permanently"}
      </button>
    </form>
  );
}
