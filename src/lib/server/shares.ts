import type { ShareSnapshot } from "@/lib/report/share";
import { getDB } from "./env";
export async function readShare(id: string): Promise<ShareSnapshot | null> {
  if (!/^[\w-]{24}$/.test(id)) return null;
  const db = await getDB();
  const row = await db.prepare(`SELECT s.snapshot_json FROM report_shares s INNER JOIN reports r ON r.id = s.report_id WHERE s.id = ? AND s.expires_at > ?`).bind(id, Date.now()).first<{ snapshot_json: string }>();
  return row ? JSON.parse(row.snapshot_json) as ShareSnapshot : null;
}
