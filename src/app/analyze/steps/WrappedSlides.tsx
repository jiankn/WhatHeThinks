"use client";

/**
 * 报告打开前的聊天回顾：日历 → 谁说得多、谁先开口 → 节奏 → 最长的消息 → 第一段对话 → 最近一段对话 → 常用词。
 * 数据全部由本地 Worker 从原始聊天算出，只在这台设备上展示。页码由父组件控制（浏览器返回键退回上一页）。
 */

import { useEffect, useRef } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import type { Role } from "@/lib/analysis/analysis-types";
import type { Wrapped, WrappedLine, WrappedMessage } from "@/lib/analysis/wrapped";
import { fmtDateFull, fmtInt, fmtPct } from "@/lib/format";

type SlideId = "calendar" | "voices" | "rhythm" | "longest" | "first" | "last" | "words";

/** 没有时间戳（粘贴的文字）时，日历和节奏两页没有意义；缺数据的页也跳过。 */
export function wrappedSlides(w: Wrapped): SlideId[] {
  const out: SlideId[] = [];
  if (!w.liteMode && w.calendar.length) out.push("calendar");
  out.push("voices");
  if (!w.liteMode && w.recordDay) out.push("rhythm");
  if (w.longest.Y || w.longest.H) out.push("longest");
  if (w.first) out.push("first");
  if (w.last) out.push("last");
  if (w.words.Y.length || w.words.H.length || w.emojis.Y.length || w.emojis.H.length) out.push("words");
  return out;
}

/** 分钟 → 大号数字 + 单位。 */
function duration(min: number | null): [string, string] {
  if (min === null || !Number.isFinite(min)) return ["–", ""];
  if (min < 1) return ["<1", "min"];
  if (min < 60) return [String(Math.round(min)), "min"];
  const h = min / 60;
  if (h < 24) return [String(Math.round(h * 10) / 10), h < 1.05 ? "hour" : "hours"];
  const d = Math.round(h / 24);
  return [String(d), d === 1 ? "day" : "days"];
}

function Pair({ you, him, children }: { you: string; him: string; children: (role: Role) => React.ReactNode }) {
  return <div className="wr-pair">
    <div><p className="wr-who is-you">{you}</p>{children("Y")}</div>
    <div><p className="wr-who is-him">{him}</p>{children("H")}</div>
  </div>;
}

function Chat({ lines, himName }: { lines: WrappedLine[]; himName: string }) {
  return <div className="wr-chat">
    {lines.map((l, i) => <div key={i} className={`wr-bubble ${l.mine ? "is-you" : "is-him"}`}>
      {!l.mine && <span>{himName}</span>}
      {l.text}
    </div>)}
  </div>;
}

function Calendar({ w }: { w: Wrapped }) {
  let lastYear = -1;
  return <div className="wr-card wr-calendar">
    <h2>Calendar</h2>
    <div className="wr-cal-grid" role="img" aria-label={`Messages per day over the last ${w.calendar.length} months. Your busiest day had ${w.recordDay?.count ?? 0} messages.`}>
      {w.calendar.map(m => {
        const showYear = m.year !== lastYear;
        lastYear = m.year;
        return <div key={`${m.year}-${m.month}`} className="wr-cal-month">
          {showYear && <p className="wr-cal-year">{m.year}</p>}
          <div className="wr-cal-row">
            <span className="wr-cal-label">{m.label[0]}</span>
            <div className="wr-cal-days">
              {m.days.map((c, i) => <i key={i} style={c ? { opacity: 0.35 + 0.65 * Math.min(1, c / w.calendarMax) } : undefined} className={c ? "is-on" : ""} />)}
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function Donut({ share }: { share: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return <svg viewBox="0 0 80 80" className="wr-donut" aria-hidden="true">
    <circle cx="40" cy="40" r={r} className="is-him" />
    <circle cx="40" cy="40" r={r} className="is-you" strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 40 40)" />
  </svg>;
}

function Longest({ who, msg, mine, himName }: { who: string; msg?: WrappedMessage; mine: boolean; himName: string }) {
  if (!msg) return null;
  return <div className="wr-card wr-beige">
    <h2>{who}</h2>
    <p className="wr-big">{fmtInt(msg.words)} <small>{msg.words === 1 ? "word" : "words"}</small></p>
    {msg.ts > 0 && <p className="wr-date">{fmtDateFull(msg.ts)}</p>}
    <Chat lines={[{ mine, text: msg.text }]} himName={himName} />
  </div>;
}

export function WrappedSlides({ wrapped: w, youName, himName, index, onIndex, onDone }: {
  wrapped: Wrapped;
  youName: string;
  himName: string;
  index: number;
  onIndex: (i: number) => void;
  onDone: () => void;
}) {
  const slides = wrappedSlides(w);
  const at = Math.min(index, slides.length - 1);
  const slide = slides[at];
  const lastSlide = at === slides.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);
  const you = "You";

  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [at]);

  const total = w.counts.Y + w.counts.H;
  const voice = total ? w.counts.Y / total : 0.5;
  const peak = Math.max(1, ...w.hours);
  const [replyYou, replyYouUnit] = duration(w.replyMin?.Y ?? null);
  const [replyHim, replyHimUnit] = duration(w.replyMin?.H ?? null);

  const body: Record<SlideId, { title: string; sub?: string; content: React.ReactNode }> = {
    calendar: {
      title: "Your time together, day by day.",
      sub: "One square per day. The brighter it is, the more you talked.",
      content: <Calendar w={w} />,
    },
    voices: {
      title: "Who talks, who starts.",
      content: <>
        <div className="wr-card wr-mint">
          <h2>Messages</h2>
          <Pair you={you} him={himName}>{r => <p className="wr-big">{fmtInt(w.counts[r])}</p>}</Pair>
        </div>
        <div className="wr-card wr-lilac">
          <h2>Share of voice</h2>
          <div className="wr-voice">
            <Donut share={voice} />
            <div>
              <p className="wr-big">{fmtPct(voice)} <small className="is-you">{you}</small></p>
              <p className="wr-big">{fmtPct(1 - voice)} <small className="is-him">{himName}</small></p>
            </div>
          </div>
        </div>
        {w.starts && <div className="wr-card wr-pink">
          <h2>Who starts the conversation</h2>
          {(["Y", "H"] as const).map(r => <div key={r} className="wr-bar-row">
            <span>{r === "Y" ? you : himName}</span>
            <div className="wr-bar"><i className={r === "Y" ? "is-you" : "is-him"} style={{ width: `${Math.round(w.starts![r] * 100)}%` }} /></div>
            <span className="num">{fmtPct(w.starts![r])}</span>
          </div>)}
        </div>}
      </>,
    },
    rhythm: {
      title: "Your rhythm.",
      content: <>
        {w.replyMin && <div className="wr-card wr-lilac">
          <h2>Typical reply time</h2>
          <Pair you={you} him={himName}>{r => r === "Y"
            ? <p className="wr-big">{replyYou} <small>{replyYouUnit}</small></p>
            : <p className="wr-big">{replyHim} <small>{replyHimUnit}</small></p>}</Pair>
        </div>}
        {w.recordDay && <div className="wr-card wr-peach">
          <h2>Record day</h2>
          <p className="wr-big">{fmtInt(w.recordDay.count)} <small>messages on {fmtDateFull(w.recordDay.ts)}</small></p>
        </div>}
        <div className="wr-split">
          <div className="wr-card wr-mint">
            <h2>Longest streak</h2>
            <p className="wr-big">{fmtInt(w.streakDays)} <small>{w.streakDays === 1 ? "day" : "days in a row"}</small></p>
          </div>
          <div className="wr-card wr-pink">
            <h2>Longest silence</h2>
            <p className="wr-big">{fmtInt(w.longestSilenceDays)} <small>{w.longestSilenceDays === 1 ? "day" : "days"}</small></p>
          </div>
        </div>
        <div className="wr-card wr-butter">
          <h2>By hour</h2>
          <div className="wr-hours" role="img" aria-label={`Most messages are sent around ${w.peakHour}:00.`}>
            {w.hours.map((c, h) => <i key={h} className={h === w.peakHour ? "is-peak" : ""} style={{ height: `${Math.max(3, (c / peak) * 100)}%` }} />)}
          </div>
          <div className="wr-hours-axis" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span></div>
          <p className="wr-note">{fmtPct(w.lateShare)} late at night (10pm–4am) · busiest around {String(w.peakHour).padStart(2, "0")}:00</p>
        </div>
      </>,
    },
    longest: {
      title: "The longest message.",
      content: <>
        <Longest who={you} msg={w.longest.Y} mine himName={himName} />
        <Longest who={himName} msg={w.longest.H} mine={false} himName={himName} />
      </>,
    },
    first: {
      title: "It all started here.",
      content: w.first && <div className="wr-card wr-beige">
        {!w.liteMode && <h2>{fmtDateFull(w.first.ts)}</h2>}
        <Chat lines={w.first.lines} himName={himName} />
      </div>,
    },
    last: {
      title: "And for now, it ends here.",
      content: w.last && <div className="wr-card wr-beige">
        {!w.liteMode && <h2>{fmtDateFull(w.last.ts)}</h2>}
        <Chat lines={w.last.lines} himName={himName} />
      </div>,
    },
    words: {
      title: "Your words.",
      content: <>
        {(w.words.Y.length > 0 || w.words.H.length > 0) && <div className="wr-card wr-mint">
          <h2>Most used words</h2>
          <Pair you={you} him={himName}>{r => <ul className="wr-list">{w.words[r].map(x => <li key={x}>{x}</li>)}</ul>}</Pair>
        </div>}
        {(w.emojis.Y.length > 0 || w.emojis.H.length > 0) && <div className="wr-card wr-butter">
          <h2>Most used emojis</h2>
          <Pair you={you} him={himName}>{r => <ul className="wr-list wr-emojis">{w.emojis[r].map(x => <li key={x}>{x}</li>)}</ul>}</Pair>
        </div>}
      </>,
    },
  };
  const { title, sub, content } = body[slide];

  return <section className="wr" aria-labelledby="wr-title">
    <div className="wr-top">
      <button type="button" className="wr-back" onClick={() => onIndex(at - 1)} disabled={at === 0} aria-label="Previous">
        <ArrowLeftIcon className="h-5 w-5" />
      </button>
      <div className="wr-progress" aria-hidden="true"><span style={{ width: `${((at + 1) / slides.length) * 100}%` }} /></div>
      <span className="wr-count">{at + 1} of {slides.length}</span>
    </div>
    <div key={slide} className="wr-slide">
      <h1 id="wr-title" ref={heading} tabIndex={-1}>{title}</h1>
      {sub && <p className="wr-sub">{sub}</p>}
      <div className="wr-cards">{content}</div>
      <button type="button" className={`btn-primary wr-next${lastSlide ? " is-final" : ""}`} onClick={() => (lastSlide ? onDone() : onIndex(at + 1))}>
        {lastSlide ? "See my report" : "Continue"} <ArrowRightIcon />
      </button>
      {at === 0 && <p className="wr-private">{youName ? `${youName}, these` : "These"} numbers come from your whole chat and never leave this device.</p>}
    </div>
  </section>;
}
