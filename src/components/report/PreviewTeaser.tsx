"use client";

/**
 * 免费预览的钩子：报告的第一页（付款前写好，读到一半渐隐）+ 报告里还有什么（真实但打码的发现）。
 * 内容全部来自她自己的聊天；不做倒计时之类的假紧迫感。
 */

import { useEffect, useRef, useState } from "react";
import { LockIcon } from "@/components/icons";
import { track } from "@/lib/events";
import type { TeaserData } from "@/lib/report/teaser";

const POLL_MS = 4000;
const MAX_POLLS = 20;

function Bubble({ text, mine = false, masked = false }: { text: string; mine?: boolean; masked?: boolean }) {
  return <div className={`teaser-bubble${mine ? " is-you" : ""}${masked ? " is-masked" : ""}`} aria-label={masked ? "Hidden until you unlock the report" : undefined}>
    <span aria-hidden={masked}>{text}</span>
  </div>;
}

/** 付款区在同一页下方：滚过去并聚焦同意勾选框，少一步操作。 */
function goToCheckout(reportId?: string, placement = "letter") {
  if (reportId) track("teaser_continue_click", { content: placement }, reportId);
  document.getElementById("paywall-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => document.querySelector<HTMLInputElement>(".reader-refund-consent input")?.focus({ preventScroll: true }), 500);
}

export function PreviewTeaser({ reportId, token, data: fixed }: { reportId?: string; token?: string; data?: TeaserData }) {
  const [data, setData] = useState<TeaserData | null>(fixed ?? null);
  // 只请求写一次；重复挂载（开发模式下的 StrictMode）只重新读取状态
  const posted = useRef(false);

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
      } catch {
        // 钩子是锦上添花：失败时页面照常显示其余预览
      }
    })();
    return () => { cancelled = true; };
  }, [fixed, reportId, token]);

  const shown = useRef(false);
  useEffect(() => {
    if (data?.opening && reportId && !shown.current) { shown.current = true; track("teaser_view", {}, reportId); }
  }, [data?.opening, reportId]);

  if (!data) return null;
  const { facts, opening } = data;
  const writing = !opening && (data.status === "pending" || data.status === "none");
  const name = facts.youName;

  return <section className="teaser" aria-labelledby="teaser-title">
    <p className="teaser-eyebrow">{opening || writing ? "The first page of your report" : "From your chat"}</p>
    {opening ? <article className="teaser-letter">
      <h2 id="teaser-title">{opening.title}</h2>
      <p>{opening.first}</p>
      <p className="teaser-fade">{opening.next}</p>
      <button type="button" className="btn-primary teaser-continue" onClick={() => goToCheckout(reportId)}>Keep reading my report ↓</button>
    </article> : writing ? <div className="teaser-letter teaser-writing" role="status">
      <h2 id="teaser-title">{name ? `Writing to you, ${name}…` : "Writing the first page of your report…"}</h2>
      <span /><span /><span /><span className="is-short" />
      <p>I&apos;m reading your chat now. This takes a few seconds.</p>
    </div> : <div className="teaser-letter">
      <h2 id="teaser-title">{name ? `${name}, here's what I found in your chat.` : "Here's what I found in your chat."}</h2>
      {facts.hisLast && <p>His last message was {facts.hisLast.daysAgo === "earlier today" ? "earlier today" : `${facts.hisLast.daysAgo} ago`}, on {facts.hisLast.date}. Your full report starts there and works back through the whole conversation.</p>}
    </div>}

    <h3 className="teaser-subhead">Also waiting in your report</h3>
    <ul className="teaser-locked">
      {facts.change && <li>
        <p><LockIcon /> <strong>What changed around {facts.change.date}</strong></p>
        {facts.change.before && <Bubble text={facts.change.before} />}
        {facts.change.afterMasked && <Bubble text={facts.change.afterMasked} masked />}
      </li>}
      {facts.repeated && <li>
        <p><LockIcon /> <strong>A line he sent in {facts.repeated.weeks} different weeks</strong></p>
        <Bubble text={facts.repeated.masked} masked />
      </li>}
      <li>
        <p><LockIcon /> <strong>The one message I&apos;d send him next</strong>, and what to watch for in his reply</p>
        <Bubble text="I •••• ••••• •• ••• •••• ••••••• •••• ••••?" mine masked />
      </li>
      <li><p><LockIcon /> <strong>{facts.chapters > 1 ? `Your story in ${facts.chapters} chapters` : "Your story"}, drawn from {facts.messages} of your real messages</strong></p></li>
      <li><p><LockIcon /> <strong>The other honest explanation</strong>, and what your side of the chat shows</p></li>
    </ul>
    <button type="button" className="btn-primary teaser-unlock" onClick={() => goToCheckout(reportId, "list")}>Unlock my full report</button>
  </section>;
}
