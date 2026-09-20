/**
 * POST /api/reports — 上传派生数据，创建报告，返回 id + token。
 * 详见 docs/PRD.md §5.3。注意：不记录请求体（含证据摘录）。
 */

import { MAX_BODY_BYTES, validateUpload, type ReportUpload } from "@/lib/report/payload";
import { getDB } from "@/lib/server/env";
import { error, json } from "@/lib/server/http";
import { createReport } from "@/lib/server/reports";
import { getRequestUser } from "@/lib/server/auth";

export async function POST(req: Request): Promise<Response> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return error("payload too large", 413);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return error("payload too large", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error("invalid json", 400);
  }
  const problem = validateUpload(body);
  if (problem) return error(problem, 400);

  const db = await getDB();
  const user = await getRequestUser(req, db);
  const { id, token } = await createReport(db, body as ReportUpload, user?.id ?? null);
  return json({ id, token }, 201);
}
