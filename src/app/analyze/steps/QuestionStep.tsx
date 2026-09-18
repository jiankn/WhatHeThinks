"use client";

import { ArrowRightIcon } from "@/components/icons";
import { CUSTOM_QUESTION_MAX, QUESTIONS, type QuestionId } from "@/lib/questions";

export function QuestionStep({
  value,
  custom,
  onCustomChange,
  onSelect,
  onContinue,
}: {
  value: QuestionId | null;
  custom: string;
  onCustomChange: (v: string) => void;
  onSelect: (q: QuestionId) => void;
  onContinue: () => void;
}) {
  return (
    <section>
      <p className="eyebrow">Step 1</p>
      <h1 className="mt-2 font-display text-3xl leading-tight font-semibold sm:text-4xl">
        What do you want to know?
      </h1>
      <p className="mt-2 text-muted">Pick the question that's on your mind. We'll focus the report on it.</p>

      <div className="mt-6 grid gap-2.5">
        {QUESTIONS.map((q) => {
          const selected = value === q.id;
          return (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              aria-pressed={selected}
              className={`group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 text-left transition ${
                selected ? "border-rose bg-rose-soft" : "border-line bg-card hover:border-ink/25"
              }`}
            >
              <span>
                <span className="block font-medium">{q.label}</span>
                <span className="block text-sm text-muted">{q.hint}</span>
              </span>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-rose" />
            </button>
          );
        })}
      </div>

      {value === "custom" && (
        <div className="mt-4 space-y-3">
          <label htmlFor="custom-q" className="text-sm font-medium">
            Your question
          </label>
          <textarea
            id="custom-q"
            value={custom}
            onChange={(e) => onCustomChange(e.target.value.slice(0, CUSTOM_QUESTION_MAX))}
            rows={3}
            placeholder="e.g. Why does he only text me late at night?"
            className="w-full resize-none rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-rose"
          />
          <button className="btn-primary w-full" disabled={custom.trim().length < 5} onClick={onContinue}>
            Continue <ArrowRightIcon />
          </button>
        </div>
      )}
    </section>
  );
}
