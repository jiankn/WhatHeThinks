/** POST /api/events — 记录漏斗事件到 D1。 */

import { cleanEventProps, isEventName } from "@/lib/events";
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
  if (!body || !isEventName(body.name) || body.name === "paid") return error("unknown event", 400);
  const reportId = typeof body.reportId === "string" && body.reportId.length <= 20 ? body.reportId : null;
  const props = JSON.stringify(cleanEventProps(body.props));

  const db = await getDB();
  await db
    .prepare(`INSERT INTO events (name, report_id, props, ts) VALUES (?, ?, ?, ?)`)
    .bind(body.name, reportId, props, Date.now())
    .run();
  return json({ ok: true }, 202);
}
