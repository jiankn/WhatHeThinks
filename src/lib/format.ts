/**
 * 展示格式化。时间戳全程按 UTC 处理（导出无时区），见 signal-scoring-spec §1.4。
 */

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** 分钟 → "12 min" / "2h 31m" / "1d 4h"。 */
export function fmtMinutes(min: number): string {
  if (!Number.isFinite(min) || min < 0) return "—";
  if (min < 1) return "<1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) {
    const m = Math.round(min - h * 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  const rh = h - d * 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export function fmtDate(ts: number, opts: { year?: boolean } = {}): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(opts.year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export function fmtDateLong(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function fmtRange([a, b]: [number, number]): string {
  const sameYear = new Date(a).getUTCFullYear() === new Date(b).getUTCFullYear();
  return `${fmtDate(a, { year: !sameYear })} – ${fmtDate(b, { year: true })}`;
}
