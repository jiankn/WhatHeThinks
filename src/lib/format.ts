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
export function fmtMinutes(raw: number): string {
  if (!Number.isFinite(raw) || raw < 0) return "—";
  if (raw < 1) return "<1 min";
  // 先取整再拆小时，避免 119.6 → "1h 60m"
  const min = Math.round(raw);
  if (min < 60) return `${min} min`;
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

/** "July 17, 2026" */
export function fmtDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
