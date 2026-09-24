"use client";

/**
 * 免费预览：报告本身的前一部分（付款前写好）。标题、开头全文、第一章的前一半（原消息做成气泡），
 * 读到一半渐隐，下面列出报告里还有什么。第一章其余部分在服务器端就截掉，不外发。
 * 内容全部来自她自己的聊天；不做倒计时之类的假紧迫感。
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LockIcon, ShieldCheckIcon } from "@/components/icons";
import { track } from "@/lib/events";
import type { PublicBlock, TeaserData } from "@/lib/report/teaser";

const POLL_MS = 4000;
const MAX_POLLS = 30;

function Block({ block }: { block: PublicBlock }) {
  if ("p" in block) return <p>{block.p}</p>;
  const { mine, text, date } = block.quote;
  return <figure className={`story-bubble ${mine ? "is-you" : "is-him"}`}>
    <blockquote>{text}</blockquote>
    <figcaption>{mine ? "You" : "Him"}{date ? ` · ${date}` : ""}</figcaption>
  </figure>;
}

/** 付款区在同一页下方：滚过去并聚焦同意勾选框，少一步操作。 */
function goToCheckout(reportId?: string, placement = "letter") {
  if (reportId) track("teaser_continue_click", { content: placement }, reportId);
  document.getElementById("paywall-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => document.querySelector<HTMLInputElement>(".reader-refund-consent input")?.focus({ preventScroll: true }), 500);
}

/** focus：当前问题（侧重点）。变了之后服务器清掉旧报告，这里重新请求预写。 */
export function PreviewTeaser({ reportId, token, focus, data: fixed }: { reportId?: string; token?: string; focus?: string; data?: TeaserData }) {
  const [data, setData] = useState<TeaserData | null>(fixed ?? null);
  // 只请求写一次；重复挂载（开发模式下的 StrictMode）只重新读取状态
  const posted = useRef(false);
  // 每个问题只请求预写一次
  const prepared = useRef<string | null>(null);

  useEffect(() => {
    if (fixed || !reportId) return;
    let cancelled = false;
    const headers = { "content-type": "application/json", "x-report-token": token ?? "" };
    const get = async () => (await fetch(`/api/reports/${reportId}/teaser`, { headers })).json() as Promise<TeaserData>;
    void (async () => {
      try {
        let next = await get();
        if (cancelled) return;
        setData(next);
        if (next.status === "none" && !posted.current) {
          posted.current = true;
          next = await (await fetch(`/api/reports/${reportId}/teaser`, { method: "POST", headers })).json() as TeaserData;
          if (cancelled) return;
          setData(next);
        }
        const waiting = (s: TeaserData["status"]) => s === "pending" || (s === "none" && posted.current);
        for (let i = 0; i < MAX_POLLS && waiting(next.status) && !cancelled; i++) {
          await new Promise(r => setTimeout(r, POLL_MS));
          next = await get();
          if (!cancelled) setData(next);
        }
        // 开头定下来后，在后台把完整报告写好：付款后即可直接打开。不等待、不影响页面；
        // keepalive 让用户离开页面时请求仍能送达。
        if ((next.status === "ready" || next.status === "failed") && !next.ready && prepared.current !== (focus ?? "")) {
          prepared.current = focus ?? "";
          const res = await fetch(`/api/reports/${reportId}/prepare`, { method: "POST", headers, keepalive: true });
          const { status } = await res.json() as { status: string };
          if (status === "ready" && !cancelled) setData(await get());
        }
      } catch {
        // 预览正文是锦上添花：失败时页面照常显示其余预览
      }
    })();
    return () => { cancelled = true; };
  }, [fixed, reportId, token, focus]);

  const shown = useRef(false);
  useEffect(() => {
    if (data?.opening && reportId && !shown.current) { shown.current = true; track("teaser_view", {}, reportId); }
  }, [data?.opening, reportId]);

  if (!data) return null;
  const { facts, opening } = data;
  const writing = !opening && (data.status === "pending" || data.status === "none");
  const name = facts.youName;

  if (!opening) {
    return <section className="teaser" aria-labelledby="teaser-title">
      {writing ? <div className="teaser-writing" role="status">
        <h1 id="teaser-title" className="teaser-title">{name ? `Writing to you, ${name}…` : "Writing your report…"}</h1>
        <span /><span /><span /><span className="is-short" />
        <p>I&apos;m reading your chat now. The first chapter usually takes under a minute.</p>
      </div> : <div>
        <h1 id="teaser-title" className="teaser-title">{name ? `${name}, here's what I found in your chat.` : "Here's what I found in your chat."}</h1>
        {facts.hisLast && <p className="teaser-lead">His last message was {facts.hisLast.daysAgo === "earlier today" ? "earlier today" : `${facts.hisLast.daysAgo} ago`}, on {facts.hisLast.date}. Your full report starts there and works back through the whole conversation.</p>}
      </div>}
    </section>;
  }

  const { chapter } = opening;
  // 没有第一章（早期写好的开头）时，最后一段开头就是渐隐的地方
  const openingShown = chapter ? opening.opening : opening.opening.slice(0, -1);
  const openingCut = chapter ? null : opening.opening.at(-1);

  return <section className="teaser" aria-labelledby="teaser-title">
    <h1 id="teaser-title" className="teaser-title">{opening.title}</h1>
    <div className="teaser-byline">
      <span className="teaser-avatar" aria-hidden="true">💌</span>
      <div>
        <strong>Your reader at WhatHeThinks</strong>
        <span>Honest, a little funny, and I read every message. I can&apos;t see inside his head, so I show you the receipts.</span>
      </div>
    </div>
    <p className="teaser-private"><ShieldCheckIcon className="h-4 w-4" /> Your chat stays private, and only you can open this report. <Link href="/privacy">Learn more</Link></p>

    <div className="teaser-body">
      {openingShown.map((p, i) => <p key={i}>{p}</p>)}
      {openingCut && <div className="teaser-cut"><p>{openingCut}</p></div>}
      {chapter && <>
        <header className="teaser-chapter">
          <span className="teaser-chapter-emoji" aria-hidden="true">{chapter.emoji}</span>
          <h2>{chapter.title}</h2>
          <span className="teaser-divider" aria-hidden="true" />
          {chapter.span && <p>{chapter.span}</p>}
        </header>
        {chapter.blocks.slice(0, -2).map((b, i) => <Block key={i} block={b} />)}
        <div className="teaser-cut">{chapter.blocks.slice(-2).map((b, i) => <Block key={i} block={b} />)}</div>
      </>}
    </div>

    <div className="teaser-gate">
      <button type="button" className="btn-primary teaser-unlock" onClick={() => goToCheckout(reportId)}><LockIcon /> Read the full report</button>
      {data.ready && <p className="teaser-ready" role="status">It&apos;s already written. It opens the moment you unlock it.</p>}
      <h3>Still inside:</h3>
      <ul className="teaser-inside">
        {opening.inside.map((item, i) => <li key={i}><span aria-hidden="true">{item.emoji}</span> {item.title}</li>)}
      </ul>
      <p className="teaser-more" aria-hidden="true">…</p>
    </div>
  </section>;
}
