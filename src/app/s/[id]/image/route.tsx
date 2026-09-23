import { ImageResponse } from "next/og";
import { QUOTE_LABEL } from "@/lib/report/share";
import { readShare } from "@/lib/server/shares";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const snapshot = await readShare((await params).id);
  if (!snapshot) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  return new ImageResponse(<div style={{ width: "100%", height: "100%", background: "#f5f5f5", color: "#171717", padding: "65px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}><div style={{ display: "flex", fontSize: 25 }}>WhatHeThinks · A shared finding</div>{snapshot.quote
    ? <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1060 }}><span style={{ fontSize: 24, color: "#6b6b6b" }}>{QUOTE_LABEL}</span><span style={{ fontSize: snapshot.quote.length > 110 ? 42 : 52, lineHeight: 1.15 }}>{`“${snapshot.quote}”`}</span></div>
    : <div style={{ display: "flex", fontSize: 60, lineHeight: 1.15, maxWidth: 1000 }}>{snapshot.headline}</div>}<div style={{ display: "flex", gap: 60 }}>{snapshot.metrics.map(m => <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}><span style={{ fontSize: 22 }}>{m.label}</span><span style={{ fontSize: 42 }}>{m.value}</span></div>)}</div><div style={{ display: "flex", fontSize: 20 }}>WhatHeThinks.com · Get your own free preview</div></div>, { width: 1200, height: 630, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
