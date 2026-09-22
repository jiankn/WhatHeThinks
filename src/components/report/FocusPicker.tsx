"use client";

/**
 * 预览页：付费前让用户选完整报告的侧重点。选项由 suggestFocus() 根据她的数据生成，
 * 每次点击立即 PATCH 保存；默认 overview（全景），不选也能直接解锁。
 */

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import type { Preview } from "@/lib/analysis/analysis-types";
import { track } from "@/lib/events";
import { CUSTOM_QUESTION_MAX, DEFAULT_QUESTION, QUESTIONS, type QuestionId } from "@/lib/questions";
import { suggestFocus, type FocusOption } from "@/lib/report/focus";

type Save = "idle" | "saving" | "saved" | "error";

export function FocusPicker({
  reportId,
  token,
  preview,
  question: initial,
  customQuestion: initialCustom,
  onReadyChange,
  onSaved,
}: {
  reportId: string;
  token: string;
  preview: Preview;
  question: QuestionId;
  customQuestion: string | null;
  onReadyChange?: (ready: boolean) => void;
  onSaved?: (question: QuestionId, customQuestion: string | null) => void;
}) {
  const [question, setQuestion] = useState<QuestionId>(initial);
  const [custom, setCustom] = useState(initialCustom ?? "");
  const [save, setSave] = useState<Save>("idle");
  const [dirty, setDirty] = useState(false);
  useEffect(() => { onReadyChange?.(!dirty && save !== "saving" && save !== "error"); }, [dirty, save, onReadyChange]);

  const suggestions = suggestFocus(preview);
  // 从落地页带进来的侧重点若不在推荐里，放在最前面保留。
  if (initial !== DEFAULT_QUESTION && initial !== "custom" && !suggestions.some((s) => s.id === initial)) {
    const q = QUESTIONS.find((x) => x.id === initial);
    if (q) suggestions.unshift({ id: q.id, label: q.label, reason: q.hint });
  }
  const options: FocusOption[] = [
    ...suggestions,
    { id: DEFAULT_QUESTION, label: "Just show me everything", reason: "A clear read, the evidence on both sides, and a useful next step." },
  ];
  const allOptions: FocusOption[] = [
    ...options,
    { id: "custom", label: "Something else", reason: "Tell us what's on your mind." },
  ];

  const persist = async (q: QuestionId, customQuestion?: string) => {
    setSave("saving");
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-report-token": token },
        body: JSON.stringify({ question: q, customQuestion }),
      });
      setSave(res.ok ? "saved" : "error");
      if (res.ok) { setDirty(false); onSaved?.(q, customQuestion ?? null); }
    } catch {
      setSave("error");
    }
  };

  const pick = (q: QuestionId) => {
    if (save === "saving") return;
    setDirty(true);
    setQuestion(q);
    if (q === "custom") {
      setSave("idle");
      return;
    }
    track("question_selected", { q, where: "preview" }, reportId);
    void persist(q);
  };

  return (
    <section className="focus-picker" aria-labelledby="focus-title">
      <p className="eyebrow">Based on your chat</p>
      <h2 id="focus-title">What should your full report dig into?</h2>

      <div className="mt-4 grid gap-2.5" role="radiogroup" aria-labelledby="focus-title">
        {allOptions.map((o, index) => {
          const selected = question === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={save === "saving"}
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => pick(o.id)}
              onKeyDown={(event) => {
                const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? allOptions.length - 1
                    : (index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + allOptions.length) % allOptions.length;
                pick(allOptions[next].id);
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
              }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
                selected ? "border-rose bg-rose-soft" : "border-line bg-card hover:border-ink/25"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-rose text-white" : "border border-line"
                }`}
              >
                {selected && <CheckIcon className="h-3 w-3" />}
              </span>
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-sm text-muted">{o.reason}</span>
              </span>
            </button>
          );
        })}
      </div>

      {question === "custom" && (
        <div className="mt-3 space-y-3">
          <label htmlFor="focus-custom" className="sr-only">
            Your question
          </label>
          <textarea
            id="focus-custom"
            disabled={save === "saving"}
            value={custom}
            onChange={(e) => {
              setDirty(true);
              setCustom(e.target.value.slice(0, CUSTOM_QUESTION_MAX));
              setSave("idle");
            }}
            rows={3}
            placeholder="e.g. He used to text first, now he doesn't. Why?"
            className="w-full resize-none rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-rose"
          />
          <button
            className="btn-primary w-full"
            disabled={custom.trim().length < 5 || save === "saving"}
            onClick={() => {
              track("question_selected", { q: "custom", where: "preview" }, reportId);
              void persist("custom", custom.trim());
            }}
          >
            Save my question
          </button>
        </div>
      )}

      <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">
        {save === "saving" && "Saving…"}
        {save === "saved" && "Saved. Your full report will lead with this."}
        {save === "error" && <span className="text-rose-dark">Couldn't save. Try again.</span>}
        {dirty && save === "idle" && "Save your question before unlocking, or select another focus."}
      </p>
    </section>
  );
}
