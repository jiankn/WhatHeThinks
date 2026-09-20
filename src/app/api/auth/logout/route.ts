import { NextResponse } from "next/server";
import { deleteSession, getSessionTokenFromRequest, SESSION_COOKIE } from "@/lib/server/auth";
import { getDB } from "@/lib/server/env";

export async function POST(req: Request): Promise<Response> {
  await deleteSession(await getDB(), getSessionTokenFromRequest(req));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
