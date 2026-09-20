"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { fmtInt, fmtRange } from "@/lib/format";
import type { ParseSummary } from "../worker-protocol";

export function IdentifyStep({
  summary,
  busy,
  onDateOrder,
  onConfirm,
}: {
  summary: ParseSummary;
  busy: boolean;
  onDateOrder: (o: "MDY" | "DMY") => void;
  onConfirm: (you: string, him: string) => void;
}) {
  const people = summary.participants;
  const isPair = people.length === 2;
  const [you, setYou] = useState<string | null>(null);
  const [him, setHim] = useState<string | null>(isPair ? null : (people[0]?.name ?? null));
  const [order, setOrder] = useState<"MDY" | "DMY">("MDY");

  const resolvedHim = isPair ? people.find((p) => p.name !== you)?.name ?? null : him;
  const ready = you && resolvedHim && you !== resolvedHim;

  return (
    <section>
      <p className="eyebrow">Step 2</p>
      <h1 className="mt-2 font-display text-3xl leading-tight font-semibold sm:text-4xl">Which one is you?</h1>
      <p className="mt-2 text-muted">
        <span className="num text-ink">{fmtInt(summary.messageCount)}</span> messages
        {summary.range && summary.hadTimestamps && (
          <>
            {" · "}
            <span className="num text-ink">{fmtRange(summary.range)}</span>
          </>
        )}
      </p>

      {isPair ? (
        <div className="mt-6 grid gap-3">
          {people.map((p) => {
            const selected = you === p.name;
            return (
              <button
                key={p.name}
                onClick={() => setYou(p.name)}
                aria-pressed={selected}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  selected ? "border-you bg-you-soft" : "border-line bg-card hover:border-ink/25"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{p.name}</span>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <span className="num">{fmtInt(p.count)}</span> msgs
                    {selected && (
                      <span className="flex items-center gap-1 rounded-full bg-you px-2 py-0.5 text-xs font-semibold text-white">
                        <CheckIcon className="h-3 w-3" /> You
                      </span>
                    )}
                    {you && !selected && (
                      <span className="rounded-full bg-him px-2 py-0.5 text-xs font-semibold text-white">Him</span>
                    )}
                  </span>
                </span>
                {summary.samples[p.name]?.length ? (
                  <span className="mt-2 block space-y-1">
                    {summary.samples[p.name].map((s, i) => (
                      <span key={i} className="block truncate text-sm text-muted">
                        “{s}”
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          <p className="text-sm text-muted">This looks like a group chat. Pick the two people to compare.</p>
          <PersonSelect label="You are" value={you} onChange={setYou} people={people} exclude={him} />
          <PersonSelect label="He is" value={him} onChange={setHim} people={people} exclude={you} />
        </div>
      )}

      {summary.dateOrder === "ambiguous" && summary.hadTimestamps && (
        <fieldset className="mt-6 rounded-2xl border border-line bg-card px-4 py-3.5">
          <legend className="px-1 text-sm font-medium">How are dates written in your chat?</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["MDY", "Month first", "03/04 = March 4"],
                ["DMY", "Day first", "03/04 = 3 April"],
              ] as const
            ).map(([val, label, ex]) => (
              <label key={val} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="date-order"
                  checked={order === val}
                  disabled={busy}
                  onChange={() => {
                    setOrder(val);
                    onDateOrder(val);
                  }}
                  className="accent-rose"
                />
                <span>
                  {label} <span className="text-muted">({ex})</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!summary.hadTimestamps && (
        <p className="mt-6 rounded-2xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          No timestamps found, so this will be a <strong>lite analysis</strong>: we can compare effort and questions,
          but not reply times or when things changed. Upload a WhatsApp export for the full timeline.
        </p>
      )}

      <button
        className="btn-primary mt-6 w-full"
        disabled={!ready || busy}
        onClick={() => ready && onConfirm(you!, resolvedHim!)}
      >
        Analyze our chat <ArrowRightIcon />
      </button>
      <p className="mt-3 text-center text-xs text-muted">Names stay on your device. We only use “You” and “Him”.</p>
    </section>
  );
}

function PersonSelect({
  label,
  value,
  onChange,
  people,
  exclude,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  people: ParseSummary["participants"];
  exclude: string | null;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-line bg-card px-4 py-3 text-base font-normal outline-none focus:border-rose"
      >
        <option value="" disabled>
          Select…
        </option>
        {people.map((p) => (
          <option key={p.name} value={p.name} disabled={p.name === exclude}>
            {p.name} ({fmtInt(p.count)} msgs){p.name === exclude ? " - already selected" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
