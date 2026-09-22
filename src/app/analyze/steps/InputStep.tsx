"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, UploadIcon } from "@/components/icons";
import { CHAT_PLATFORMS, type ChatPlatformId } from "@/lib/platforms";
import type { ParseSummary } from "../worker-protocol";
import { ChatReveal } from "./ChatReveal";

type Mode = "upload" | "paste";

export function InputStep({
  busy,
  onFile,
  onPaste,
  initialPlatform,
  intake,
  onContinue,
  onReset,
}: {
  busy: boolean;
  onFile: (f: File) => void;
  onPaste: (text: string) => void;
  initialPlatform: ChatPlatformId;
  /** 正在读取或已读完的聊天；有值时用揭晓动画替换上传框。 */
  intake: { label: string; summary: ParseSummary | null } | null;
  onContinue: () => void;
  onReset: () => void;
}) {
  const selectedPlatform = CHAT_PLATFORMS.find((platform) => platform.id === initialPlatform)!;
  const [mode, setMode] = useState<Mode>(selectedPlatform.nativeUpload ? "upload" : "paste");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <section className="import-layout" aria-busy={busy}>
      <div className="import-form">
      <h1>{intake ? `Reading your ${selectedPlatform.name} chat` : `Add your ${selectedPlatform.name} chat`}</h1>
      <p className="import-question text-muted">
        {intake ? "Everything happens on this device. Nothing has been sent yet." : "We'll read the pattern first, then you choose what to dig into."}
      </p>

      {intake ? (
        <ChatReveal label={intake.label} summary={intake.summary} onContinue={onContinue} onReset={onReset} />
      ) : (
      <>

      {!selectedPlatform.nativeUpload && <div className="platform-import-note"><strong>Paste messages from {selectedPlatform.name}</strong><span>Copy part of the conversation and paste it below. File upload isn&apos;t supported yet.</span></div>}
      <div role="group" aria-label="Chat input method" className="import-tabs">
        {(["upload", "paste"] as Mode[]).map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)} disabled={m === "upload" && !selectedPlatform.nativeUpload}
            className={mode === m ? "is-active" : ""}
          >
            {m === "upload" ? "Upload export" : "Paste text"}
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
            className={`upload-dropzone ${dragging ? "is-dragging" : ""} ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            <UploadIcon className="upload-icon" />
            <span className="mt-4 text-lg font-semibold">{busy ? "Reading your chat…" : "Drop your chat file here"}</span>
            <span className="mt-1 text-sm text-muted">.txt or .zip · Without media</span>
            <span className="btn-primary mt-5">Choose a file</span>
            <input
              ref={input}
              type="file"
              accept=".txt,.zip,text/plain,application/zip"
              className="sr-only"
              aria-label="Choose your WhatsApp chat file"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>

          <details className="export-help group mt-5 rounded-xl border border-line px-4 py-4 text-sm">
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
          <label htmlFor="chat-paste" className="sr-only">Paste your chat text</label>
          <textarea
            id="chat-paste"
            aria-label="Paste your chat text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"Paste your chat here.\n\n[5/18/25, 9:41:05 PM] Jake: hey you\n[5/18/25, 9:43:10 PM] Emma: hiii"}
            className="w-full resize-y rounded-2xl border border-line bg-card px-4 py-3 font-mono text-sm outline-none focus:border-rose"
          />
          <p className="text-xs text-muted">
            Include timestamps if available to analyze reply times and changes over time. Plain “Name: message” lines
            work too.
          </p>
          <button className="btn-primary w-full" disabled={busy || text.trim().length < 20} onClick={() => onPaste(text)}>
            {busy ? "Reading…" : "Use this text"}
          </button>
        </div>
      )}

      <p className="import-free-note">Free preview first. No payment required.</p>
      <p className="import-terms">
        By continuing, you confirm that you are part of this conversation and agree to our{" "}
        <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
      </>
      )}
      </div>
      <aside className="import-privacy">
        <Image src="/images/privacy-envelope.webp" alt="A private letter in a plum envelope, beside a rose." width={1000} height={1000} sizes="(max-width: 767px) 80vw, 36vw" />
        <h2>A little privacy. A lot of clarity.</h2>
        <p>Your full chat stays on this device. To build your report, we send statistics and up to 120 redacted example messages. Examples are deleted after 30 days.</p>
        <Link href="/privacy" className="text-link underlined-link">How your data is handled <ArrowRightIcon /></Link>
      </aside>
    </section>
  );
}
