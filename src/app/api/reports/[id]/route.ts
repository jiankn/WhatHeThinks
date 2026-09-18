/**
 * GET    /api/reports/:id — 读取报告（付费前只返回 preview）。
 * DELETE /api/reports/:id — 硬删除报告与证据。
 * 均需 x-report-token 头。详见 docs/PRD.md §5.7。
 */

import { getDB } from "@/lib/server/env";
import { error, json, TOKEN_HEADER } from "@/lib/server/http";
import { deleteReport, getAuthorizedRow, toView } from "@/lib/server/reports";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const db = await getDB();
  const row = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  if (!row) return error("not found", 404);
  return json(await toView(db, row));
}

export async function DELETE(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const db = await getDB();
  const row = await getAuthorizedRow(db, id, req.headers.get(TOKEN_HEADER));
  if (!row) return error("not found", 404);
  await deleteReport(db, id);
  return json({ deleted: true });
}
