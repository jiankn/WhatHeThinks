"use client";

import { useRef, useState } from "react";
import { LockIcon, UploadIcon } from "@/components/icons";
import { questionLabel, type QuestionId } from "@/lib/questions";

type Mode = "upload" | "paste";

export function InputStep({
  question,
  customQuestion,
  busy,
  onFile,
  onPaste,
  onChangeQuestion,
}: {
  question: QuestionId;
  customQuestion: string;
  busy: boolean;
  onFile: (f: File) => void;
  onPaste: (text: string) => void;
  onChangeQuestion: () => void;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <section>
      <p className="eyebrow">Step 2</p>
      <h1 className="mt-2 font-display text-3xl leading-tight font-semibold sm:text-4xl">Add your chat</h1>
      <p className="mt-2 text-muted">
        <span className="text-ink">“{questionLabel(question, customQuestion)}”</span>{" "}
        <button onClick={onChangeQuestion} className="text-sm text-rose underline-offset-2 hover:underline">
          Change
        </button>
      </p>

      <div role="tablist" className="mt-6 grid grid-cols-2 rounded-full border border-line bg-card p-1 text-sm font-medium">
        {(["upload", "paste"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full py-2 transition ${mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
          >
            {m === "upload" ? "Upload WhatsApp export" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) onFile(f);
            }}
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
              dragging ? "border-rose bg-rose-soft" : "border-line bg-card hover:border-rose/50"
            } ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-soft text-rose">
              <UploadIcon />
            </span>
            <span className="mt-4 font-semibold">{busy ? "Reading your chat…" : "Choose your chat file"}</span>
            <span className="mt-1 text-sm text-muted">WhatsApp export · .txt or .zip</span>
            <input
              ref={input}
              type="file"
              accept=".txt,.zip,text/plain,application/zip"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>

          <details className="group mt-4 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              How do I export a WhatsApp chat?
              <span className="float-right text-muted transition group-open:rotate-45">+</span>
            </summary>
            <div className="mt-3 grid gap-4 text-muted sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">iPhone</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                  <li>Open the chat with him</li>
                  <li>Tap his name at the top</li>
                  <li>Scroll down → Export Chat</li>
                  <li>Choose Without Media</li>
                  <li>Save to Files, then upload here</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-ink">Android</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                  <li>Open the chat with him</li>
                  <li>Tap ⋮ → More → Export chat</li>
                  <li>Choose Without media</li>
                  <li>Save the file, then upload here</li>
                </ol>
              </div>
            </div>
          </details>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"Paste your WhatsApp chat here.\n\n[5/18/25, 9:41:05 PM] Jake: hey you\n[5/18/25, 9:43:10 PM] Emma: hiii"}
            className="w-full resize-y rounded-2xl border border-line bg-card px-4 py-3 font-mono text-sm outline-none focus:border-rose"
          />
          <p className="text-xs text-muted">
            Plain “Name: message” lines work too, but without timestamps we can't measure reply times or when things
            changed.
          </p>
          <button className="btn-primary w-full" disabled={busy || text.trim().length < 20} onClick={() => onPaste(text)}>
            {busy ? "Reading…" : "Use this text"}
          </button>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-plum px-4 py-3.5 text-sm text-paper/90">
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-soft" />
        <span>
          Your chat is read <strong className="text-paper">on this device</strong>. The full conversation is never
          uploaded — only statistics and a small set of anonymized example messages.
        </span>
      </p>
    </section>
  );
}
