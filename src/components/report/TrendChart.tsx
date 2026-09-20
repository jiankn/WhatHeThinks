"use client";

/**
 * 他的周趋势图（单序列、单 y 轴）。三个指标用分段按钮切换，不叠双轴。
 * 按容器真实宽度渲染 SVG（文字不随 viewBox 缩放），带十字准线，悬停值显示在图下方固定读数行，
 * 转折点用竖虚线标注，并提供表格视图作为无障碍替代。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtDate, fmtMinutes, fmtPct } from "@/lib/format";
import type { SeriesPoint, TPNarrative } from "@/lib/report/types";

type MetricKey = "himInitShare" | "himReplyMin" | "himMsgShare";

const METRICS: { key: MetricKey; label: string; title: string; fmt: (v: number) => string; unit: "share" | "minutes" }[] = [
  { key: "himInitShare", label: "Who starts", title: "Share of conversations he started, by week", fmt: fmtPct, unit: "share" },
  { key: "himReplyMin", label: "Reply time", title: "His typical reply time, by week", fmt: fmtMinutes, unit: "minutes" },
  { key: "himMsgShare", label: "Message share", title: "His share of all messages, by week", fmt: fmtPct, unit: "share" },
];

const PAD = { top: 24, right: 12, bottom: 26, left: 44 };

function niceMax(v: number): number {
  if (v <= 0) return 60;
  const steps = [15, 30, 60, 120, 240, 480, 720, 1440, 2880];
  return steps.find((s) => s >= v * 1.1) ?? Math.ceil(v / 1440) * 1440;
}

export function TrendChart({ series, points, compact = false }: { series: SeriesPoint[]; points: TPNarrative[]; compact?: boolean }) {
  const H = compact ? 120 : 200;
  const [metric, setMetric] = useState<MetricKey>("himInitShare");
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(600);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(160, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = METRICS.find((x) => x.key === metric)!;
  const values = series.map((s) => s[metric]);

  const geo = useMemo(() => {
    const t0 = series[0]?.weekStart ?? 0;
    const t1 = series[series.length - 1]?.weekStart ?? 1;
    const innerW = width - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const maxValue = Math.max(0, ...values.filter((v): v is number => v !== null));
    const yMax = m.unit === "share" ? Math.min(1, Math.max(.25, Math.ceil((maxValue + .01) * 4) / 4)) : niceMax(maxValue);
    const x = (t: number) => PAD.left + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
    const y = (v: number) => PAD.top + innerH - (Math.min(v, yMax) / yMax) * innerH;
    const ticks = m.unit === "share" ? Array.from({ length: Math.round(yMax * 4) + 1 }, (_, i) => i / 4) : [0, yMax / 2, yMax];

    // null 断开折线
    const segments: string[] = [];
    let cur: string[] = [];
    series.forEach((s, i) => {
      const v = values[i];
      if (v === null) {
        if (cur.length) segments.push(cur.join(" "));
        cur = [];
      } else cur.push(`${x(s.weekStart).toFixed(1)},${y(v).toFixed(1)}`);
    });
    if (cur.length) segments.push(cur.join(" "));
    return { x, y, ticks, segments, t0, t1, innerW };
  }, [series, values, width, m.unit, H]);

  if (series.length < 2) return null;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + PAD.left;
    let best = 0;
    let bestD = Infinity;
    series.forEach((s, i) => {
      const d = Math.abs(geo.x(s.weekStart) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hv = hover !== null ? values[hover] : null;
  const hx = hover !== null ? geo.x(series[hover].weekStart) : 0;
  const xLabels = [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]];

  return (
    <figure className={`trend-chart card px-4 pt-4 pb-3 sm:px-5 ${compact ? "trend-chart-compact" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm text-muted">{compact ? "Conversations he started (%)" : m.title}</figcaption>
        {!compact && <div role="group" aria-label="Metric" className="chart-controls flex rounded-lg border border-line p-0.5 text-xs">
          {METRICS.map((x) => (
            <button
              key={x.key}
              aria-pressed={metric === x.key}
              onClick={() => setMetric(x.key)}
              className={`rounded-full px-2.5 py-1 font-medium transition ${metric === x.key ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {x.label}
            </button>
          ))}
        </div>}
      </div>

      <div ref={box} className="relative mt-3">
        {showTable ? (
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-card text-muted">
                <tr>
                  <th className="py-1.5 font-medium">Week of</th>
                  <th className="py-1.5 text-right font-medium">{METRICS.find((x) => x.key === metric)!.label}</th>
                </tr>
              </thead>
              <tbody className="num">
                {series.map((s, i) => (
                  <tr key={s.weekStart} className="border-t border-line">
                    <td className="py-1.5">{fmtDate(s.weekStart, { year: true })}</td>
                    <td className="py-1.5 text-right">{values[i] === null ? "—" : m.fmt(values[i]!)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <svg width={width} height={H} className="block overflow-visible" role="img" aria-label={`${m.title}. Use the table view for exact values.`}>
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "2 4"} />
                <text x={PAD.left - 8} y={geo.y(t) + 4} textAnchor="end" className="fill-faint font-mono text-[10px]">
                  {m.fmt(t)}
                </text>
              </g>
            ))}

            {points.map((p) => {
              const px = geo.x(p.date);
              if (px < PAD.left || px > width - PAD.right) return null;
              return (
                <g key={p.id}>
                  <line x1={px} x2={px} y1={PAD.top - 8} y2={H - PAD.bottom} stroke="var(--color-muted)" strokeDasharray="3 3" strokeWidth={1} />
                  <text x={px} y={PAD.top - 12} textAnchor="middle" className="fill-ink text-[11px] font-medium">
                    {fmtDate(p.date)}
                  </text>
                </g>
              );
            })}

            {geo.segments.map((pts, i) => {
              const ends = pts.split(" ");
              const left = ends[0].split(",")[0];
              const right = ends[ends.length - 1].split(",")[0];
              return <g key={i}>
                <polygon points={`${left},${H - PAD.bottom} ${pts} ${right},${H - PAD.bottom}`} fill="var(--color-rose-soft)" fillOpacity={.6} />
                <polyline points={pts} fill="none" stroke="var(--color-him)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>;
            })}
            {series.map((s, i) => values[i] !== null && <circle key={s.weekStart} cx={geo.x(s.weekStart)} cy={geo.y(values[i]!)} r={3} fill="var(--color-him)" />)}

            {xLabels.map((s, i) => (
              <text
                key={i}
                x={geo.x(s.weekStart)}
                y={H - 6}
                textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                className="fill-faint font-mono text-[10px]"
              >
                {fmtDate(s.weekStart)}
              </text>
            ))}

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={hx} x2={hx} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-ink)" strokeOpacity={0.25} />
                {hv !== null && <circle cx={hx} cy={geo.y(hv)} r={4.5} fill="var(--color-him)" stroke="var(--color-card)" strokeWidth={2} />}
              </g>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={Math.max(0, width - PAD.left - PAD.right)}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

      </div>

      <div className={`chart-readout flex items-center justify-between gap-3 ${compact ? "" : "mt-2"}`}>
        <p className="text-xs text-muted" aria-live="polite">
          {!showTable && hover !== null ? (
            <>
              Week of {fmtDate(series[hover].weekStart)} ·{" "}
              <span className="num font-semibold text-ink">{hv === null ? "no data" : m.fmt(hv)}</span>
            </>
          ) : (
            !showTable && !compact && "Hover or tap the line for weekly values"
          )}
        </p>
        <button onClick={() => setShowTable((v) => !v)} className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
          {showTable ? "Show chart" : "Show as table"}
        </button>
      </div>
    </figure>
  );
}
