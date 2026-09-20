"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRightIcon, LockIcon, UploadIcon } from "@/components/icons";
import { setPendingChat, setPendingChatText } from "@/lib/pending-chat";

type Kind = "interest" | "mixed";
type InputMode = "paste" | "upload";

export function IntentToolLanding({ kind }: { kind: Kind }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [dragging, setDragging] = useState(false);
  const question = kind === "interest" ? "likes_me" : "mixed_signals";
  const analyzeHref = `/analyze?q=${question}`;

  const choose = (selected?: File) => {
    if (selected) setFile(selected);
  };

  const start = () => {
    if (kind === "interest" && inputMode === "paste") {
      const chat = text.trim();
      if (chat.length < 20) return;
      setPendingChatText(chat);
      router.push(analyzeHref);
      return;
    }
    if (!file) {
      input.current?.click();
      return;
    }
    setPendingChat(file);
    router.push(analyzeHref);
  };

  return (
    <main className={`intent-tool-page ${kind === "interest" ? "is-interest" : "is-mixed"}`}>
      <section className="intent-tool-intro" aria-labelledby="intent-title">
        <div>
          <p className="intent-tool-eyebrow">{kind === "interest" ? "AI text analyzer" : "Mixed signals"}</p>
          <h1 id="intent-title">
            {kind === "interest" ? "Does he like me?" : "Where do his words and actions disagree?"}
          </h1>
          <p>
            {kind === "interest"
              ? "Paste your messages or upload the chat. AI will give you a clear answer based on his effort, consistency, and follow-through."
              : "Analyze repeated patterns across your whole WhatsApp chat, not one confusing exchange."}
          </p>
        </div>

        {kind === "mixed" && (
          <div className="intent-context-card" aria-labelledby="compare-title">
            <h2 id="compare-title">What we compare</h2>
            <ul>
              <li>Warmth ↔ plans</li>
              <li>Replies ↔ initiative</li>
              <li>Promises ↔ follow-through</li>
              <li>Silence ↔ returns</li>
            </ul>
          </div>
        )}
      </section>

      <section className="intent-workspace" aria-label="Chat analysis tool">
        <div className="intent-input-card">
          <h2>{kind === "interest" ? "Add your conversation" : "Start with your chat"}</h2>
          <p>{kind === "interest" ? "A longer chat gives the AI more context." : "Upload a WhatsApp .txt or .zip export."}</p>

          {kind === "interest" && (
            <div className="intent-input-tabs" role="group" aria-label="Choose how to add your chat">
              <button type="button" className={inputMode === "paste" ? "is-active" : ""} aria-pressed={inputMode === "paste"} onClick={() => setInputMode("paste")}>Paste messages</button>
              <button type="button" className={inputMode === "upload" ? "is-active" : ""} aria-pressed={inputMode === "upload"} onClick={() => setInputMode("upload")}>Upload chat</button>
            </div>
          )}

          {kind === "interest" && inputMode === "paste" ? (
            <textarea
              className="intent-chat-textarea"
              aria-label="Paste your chat messages"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={"Paste your messages here…\n\nAlex: Had a good time tonight\nYou: Me too :)\nAlex: Want to do it again this weekend?"}
            />
          ) : (
            <label
              className={`intent-dropzone ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                choose(event.dataTransfer.files[0]);
              }}
            >
              <UploadIcon />
              <strong>{file ? file.name : "Choose chat export"}</strong>
              <span>{file ? "Ready to analyze · Choose another file" : ".txt or .zip · or drop it here"}</span>
              <input
                ref={input}
                type="file"
                accept=".txt,.zip,text/plain,application/zip"
                onChange={(event) => {
                  choose(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          )}

          {kind === "mixed" && <Link className="intent-paste-link" href={analyzeHref}>Paste messages instead</Link>}
          <p className="intent-private-note"><LockIcon /> Analyzed privately on your device</p>
          <button
            type="button"
            className="intent-primary-action"
            onClick={start}
            disabled={kind === "interest" && inputMode === "paste" && text.trim().length < 20}
          >
            {kind === "interest"
              ? inputMode === "paste" ? "Analyze: does he like me?" : file ? "Analyze: does he like me?" : "Choose chat export"
              : file ? "Check mixed signals" : "Choose chat export"}
            <ArrowRightIcon />
          </button>
          <p className="intent-consent">
            By continuing, you confirm you&apos;re part of this chat and agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>

        {kind === "interest" ? <InterestPreview /> : <MixedPreview />}
      </section>

      {kind === "mixed" && <p className="intent-boundary">No labels. No red-flag diagnosis. Just the mismatch and the evidence.</p>}
    </main>
  );
}

function InterestPreview() {
  return (
    <article className="intent-preview-card" aria-labelledby="interest-preview-title">
      <div className="intent-preview-heading">
        <h2 id="interest-preview-title">A clear AI answer</h2>
        <span>Example result</span>
      </div>
      <div className="intent-preview-answer">
        <h3>Yes — he seems interested, but his effort is uneven.</h3>
        <dl className="intent-evidence-list">
          <div><dt>Why</dt><dd>He asks questions and keeps the conversation going.</dd></div>
          <div><dt>What holds it back</dt><dd>You start most conversations.</dd></div>
          <div><dt>What to watch</dt><dd>Whether he makes the next real plan.</dd></div>
        </dl>
      </div>
      <p className="intent-preview-foot">Your answer will cite the messages and patterns behind the judgment.</p>
    </article>
  );
}

function MixedPreview() {
  return (
    <article className="intent-preview-card" aria-labelledby="mixed-preview-title">
      <div className="intent-preview-heading">
        <h2 id="mixed-preview-title">What you&apos;ll get</h2>
        <span>Example · Last 6 weeks</span>
      </div>
      <h3 className="intent-mixed-answer">Warm contact. Low momentum.</h3>
      <div className="intent-compare-table">
        <div className="is-warm">
          <h4>What feels warm</h4>
          <p>Replies in 9 min</p>
          <p>23 affectionate messages</p>
        </div>
        <div className="is-distance">
          <h4>What doesn&apos;t match</h4>
          <p>Starts 18% of chats</p>
          <p>1 concrete plan</p>
        </div>
      </div>
      <p className="intent-next-step"><strong>Next step:</strong> ask for one clear plan, then watch what happens.</p>
    </article>
  );
}
