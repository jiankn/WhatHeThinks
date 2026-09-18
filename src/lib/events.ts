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
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(v: unknown): v is EventName {
  return typeof v === "string" && (EVENT_NAMES as readonly string[]).includes(v);
}

/** 浏览器端上报，失败静默。props 只放枚举值/数字，不放聊天内容。 */
export function track(name: EventName, props?: Record<string, string | number | boolean>, reportId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, props, reportId });
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // 埋点失败不影响用户
  }
}
