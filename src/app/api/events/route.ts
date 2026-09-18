/** POST /api/events — 记录漏斗事件到 D1。 */

import { isEventName } from "@/lib/events";
import { getDB } from "@/lib/server/env";
import { error, json } from "@/lib/server/http";

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  if (raw.length > 2000) return error("too large", 413);
  let body: { name?: unknown; props?: unknown; reportId?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return error("invalid json", 400);
  }
  if (!isEventName(body.name)) return error("unknown event", 400);
  const reportId = typeof body.reportId === "string" && body.reportId.length <= 20 ? body.reportId : null;
  const props = body.props && typeof body.props === "object" ? JSON.stringify(body.props).slice(0, 1000) : null;

  const db = await getDB();
  await db
    .prepare(`INSERT INTO events (name, report_id, props, ts) VALUES (?, ?, ?, ?)`)
    .bind(body.name, reportId, props, Date.now())
    .run();
  return json({ ok: true }, 202);
}
