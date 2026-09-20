import { nanoid } from "nanoid";
import type { Preview } from "@/lib/analysis/analysis-types";
import { buildShareSnapshot } from "@/lib/report/share";
import { getRequestUser } from "@/lib/server/auth";
import { getDB } from "@/lib/server/env";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { getAuthorizedRow, type ReportRow } from "@/lib/server/reports";
type Ctx = { params: Promise<{ id: string }> };
async function authorize(req: Request, id: string, db: D1Database): Promise<ReportRow | null> {
  if (!/^[\w-]{12}$/.test(id)) return null;
  const byToken = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  if (byToken) return byToken;
  const user = await getRequestUser(req, db);
  return user ? db.prepare(`SELECT * FROM reports WHERE id = ? AND user_id = ?`).bind(id, user.id).first<ReportRow>() : null;
}
function validOrigin(req: Request) { const origin = req.headers.get("origin"); return !origin || origin === new URL(req.url).origin; }
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDB();
  if (!await authorize(req, id, db)) return error("not found", 404);
  const share = await db.prepare(`SELECT id, expires_at FROM report_shares WHERE report_id = ? AND expires_at > ?`).bind(id, Date.now()).first<{ id: string; expires_at: number }>();
  return json({ shareId: share?.id ?? null, expiresAt: share?.expires_at ?? null });
}
export async function POST(req: Request, { params }: Ctx) {
  if (!validOrigin(req)) return error("invalid origin", 403);
  const raw = await req.text();
  if (raw.length > 256) return error("too large", 413);
  let body: { showMetrics?: unknown };
  try { body = JSON.parse(raw); } catch { return error("invalid json", 400); }
  if (!body || typeof body.showMetrics !== "boolean") return error("choose visibility", 400);
  const { id } = await params;
  const db = await getDB();
  const row = await authorize(req, id, db);
  if (!row) return error("not found", 404);
  const snapshot = buildShareSnapshot(JSON.parse(row.preview_json) as Preview, body.showMetrics);
  const now = Date.now();
  const expiresAt = now + 30 * 86400000;
  // One link per report. Explicitly publishing again updates its selected summary.
  const saved = await db.prepare(`INSERT INTO report_shares (id, report_id, snapshot_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(report_id) DO UPDATE SET snapshot_json = excluded.snapshot_json, expires_at = excluded.expires_at RETURNING id`).bind(nanoid(24), id, JSON.stringify(snapshot), now, expiresAt).first<{ id: string }>();
  return json({ shareId: saved!.id, expiresAt }, 201);
}
export async function DELETE(req: Request, { params }: Ctx) {
  if (!validOrigin(req)) return error("invalid origin", 403);
  const { id } = await params;
  const db = await getDB();
  if (!await authorize(req, id, db)) return error("not found", 404);
  await db.prepare(`DELETE FROM report_shares WHERE report_id = ?`).bind(id).run();
  return json({ revoked: true });
}
