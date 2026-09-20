"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CHAT_SCENES, type ChatScene } from "@/content/chat-scenes";
import "./chat-scenes-wall.css";

const ROWS = [CHAT_SCENES.slice(0, 6), CHAT_SCENES.slice(6, 12)];

export function ChatScenesWall() {
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<ChatScene | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selected]);

  function close() {
    dialog.current?.close();
    setSelected(null);
    returnFocus.current?.focus({ preventScroll: true });
  }

  return <section className="chat-wall" id="chat-examples" aria-labelledby="chat-wall-title" data-paused={paused || Boolean(selected)}>
    <header className="chat-wall-heading">
      <div><h2 id="chat-wall-title">A familiar kind of conversation.</h2><p>The plans, the check-ins, the messages you read twice. Tap a chat to take a closer look.</p></div>
      <button ref={pauseButton} type="button" className="chat-wall-pause" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>{paused ? "Resume scrolling" : "Pause scrolling"}
      </button>
    </header>
    <p className="chat-wall-disclosure">12 fictional WhatsApp-style chats. AI-generated illustrations, not customer messages or reviews.</p>
    <div className="chat-wall-rows">
      {ROWS.map((scenes, row) => <div className="chat-wall-row" key={row} aria-label={`Chat examples, row ${row + 1}`}>
        <div className={`chat-wall-track ${row === 1 ? "is-reverse" : ""}`}>
          {[false, true].map(duplicate => <ul className="chat-wall-group" key={String(duplicate)} aria-hidden={duplicate || undefined}>
            {scenes.map(scene => <li key={scene.slug}>
              <button type="button" className="chat-wall-card" tabIndex={duplicate ? -1 : 0}
                aria-label={`Open fictional chat: ${scene.title}`}
                onMouseDown={event => { if (duplicate) event.preventDefault(); }}
                onClick={event => {
                  returnFocus.current = duplicate ? pauseButton.current : event.currentTarget;
                  setSelected(scene);
                }}>
                <span className="chat-wall-card-title">{scene.title}<span aria-hidden="true">↗</span></span>
                <Image src={`/images/chat-wall/${scene.slug}.webp`} alt="" width={720} height={1280} sizes="(max-width: 600px) 188px, (max-width: 1400px) 230px, 280px" loading="lazy" />
              </button>
            </li>)}
          </ul>)}
        </div>
      </div>)}
    </div>
    <p className="chat-wall-footnote">One exchange is only a starting point. Your report looks at the wider conversation. <Link href="/sample-report">Read a sample report ↗</Link></p>
    <dialog ref={dialog} className="chat-wall-dialog" aria-labelledby="chat-wall-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      {selected && <div className="chat-wall-dialog-inner">
        <header><div><p>Fictional chat</p><h2 id="chat-wall-dialog-title">{selected.title}</h2></div><button type="button" onClick={close} autoFocus aria-label="Close chat example">Close <span aria-hidden="true">×</span></button></header>
        <div className="chat-wall-dialog-body">
          <Image src={`/images/chat-wall/${selected.slug}.webp`} alt={`Illustrated WhatsApp chat: ${selected.title}. The messages are available in the transcript.`} width={720} height={1280} sizes="(max-width: 600px) 85vw, 360px" />
          <div className="chat-wall-dialog-copy"><h3>Something to notice</h3><p>{selected.note}</p><p className="chat-wall-dialog-note">This is a made-up exchange. It cannot tell you how someone in your own life feels.</p>
            <details><summary>Read the messages as text</summary><ol>{selected.messages.map(([speaker, message], index) => <li key={index}><strong>{speaker}</strong><p>{message}</p></li>)}</ol></details>
            <Link href={`/analyze?q=${selected.question}`} className="btn-primary">Explore my own chat ↗</Link>
            <span className="chat-wall-dialog-note">Free preview. No account or card needed.</span>
          </div>
        </div>
      </div>}
    </dialog>
  </section>;
}
