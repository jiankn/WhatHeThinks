/**
 * 漏斗埋点事件名（PRD §5.9、BP §31）。前后端共用白名单。
 */

export const EVENT_NAMES = [
  "landing_view",
  "analyze_start",
  "question_selected",
  "upload_parsed",
  "parse_failed",
  "preview_view",
  "checkout_click",
  "paid",
  "followup_click",
  "followup_submit",
  "evidence_open",
  "delete",
  "tool_used",
  "report_created",
  "card_preview",
  "card_download",
  "share_intent",
  "share_completed",
  "share_link_created",
  "share_revoked",
  "share_landing_view",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(v: unknown): v is EventName {
  return typeof v === "string" && (EVENT_NAMES as readonly string[]).includes(v);
}

/** 浏览器端上报，失败静默。props 只放枚举值/数字，不放聊天内容。 */
export function track(name: EventName, props?: Record<string, string | number | boolean>, reportId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, props: { ...getAttribution(), ...props }, reportId });
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    }
  } catch {
    // 埋点失败不影响用户
  }
}

const SOURCES = ["tiktok", "instagram", "facebook", "share", "google", "direct", "other"];
export function getAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem("wht:visit");
    if (stored) return JSON.parse(stored);
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source")?.toLowerCase() ?? (window.location.pathname.startsWith("/s/") ? "share" : "direct");
    const visit: Record<string, string> = { session: crypto.randomUUID(), source: SOURCES.includes(source) ? source : "other" };
    for (const key of ["campaign", "content"]) {
      const v = params.get(`utm_${key}`);
      if (v && /^[a-zA-Z0-9_-]{1,48}$/.test(v)) visit[key] = v;
    }
    const ref = params.get("ref") ?? (window.location.pathname.startsWith("/s/") ? window.location.pathname.split("/")[2] : null);
    if (ref && /^[\w-]{24}$/.test(ref)) visit.ref = ref;
    sessionStorage.setItem("wht:visit", JSON.stringify(visit));
    return visit;
  } catch { return {}; }
}

/** Never accept arbitrary text/URLs from clients into the event store. */
export function cleanEventProps(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, v] of Object.entries(value)) {
    if (["paid", "lite", "sample"].includes(key) && typeof v === "boolean") clean[key] = v;
    if (["messages", "participants", "n"].includes(key) && typeof v === "number" && Number.isFinite(v) && v >= 0) clean[key] = v;
    if (["q", "code", "tool", "format", "method", "source", "campaign", "content", "session", "ref"].includes(key) && typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v)) clean[key] = v;
  }
  return clean;
}
