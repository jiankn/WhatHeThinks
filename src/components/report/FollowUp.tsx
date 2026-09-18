"use client";

/**
 * 追问 CTA（PRD §5.8）。MVP 只收集问题 + 邮箱验证需求（Paid → Follow-up KPI），暂不收费。
 */

import { useState } from "react";
import { track } from "@/lib/events";

export function FollowUp({ reportId, token }: { reportId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/followups", {
      method: "POST",
      headers: { "content-type": "application/json", "x-report-token": token },
      body: JSON.stringify({ reportId, question, email }),
    }).catch(() => null);
    if (res?.ok) {
      setState("done");
      track("followup_submit", {}, reportId);
    } else setState("error");
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-card px-5 py-6">
      <p className="eyebrow">Still wondering about something?</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">Ask one more question about this chat</h2>
      <p className="mt-2 text-muted">
        “Why does he only text late at night?” “Did anything change after our trip?” Get an answer backed by your
        actual messages — <span className="font-medium text-ink">$3.99</span>.
      </p>

      {state === "done" ? (
        <p className="mt-4 rounded-2xl bg-ok/10 px-4 py-3 text-sm text-ok">
          Got it. Follow-up answers are launching soon — we'll email you as soon as yours can be answered.
        </p>
      ) : !open ? (
        <button
          className="btn-secondary mt-4"
          onClick={() => {
            setOpen(true);
            track("followup_click", {}, reportId);
          }}
        >
          Ask a follow-up question
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <textarea
            required
            minLength={5}
            maxLength={300}
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What else do you want to know?"
            className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-rose"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-rose"
          />
          <p className="text-xs text-muted">
            Follow-up answers are launching soon. Leave your question and we'll email you when it's ready — you won't be
            charged now.
          </p>
          <button className="btn-primary w-full" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Save my question"}
          </button>
          {state === "error" && <p className="text-sm text-rose-dark">Couldn't save that. Please try again.</p>}
        </form>
      )}
    </section>
  );
}
