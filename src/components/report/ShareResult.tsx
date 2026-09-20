"use client";
import { useEffect, useState } from "react";
import type { Preview } from "@/lib/analysis/analysis-types";
import { buildShareSnapshot } from "@/lib/report/share";
import { renderShareImage } from "@/lib/report/share-image";
import { track } from "@/lib/events";
import { ShareCard } from "./ShareCard";

export function ShareResult({ preview, reportId, token = "", sample = false }: { preview: Preview; reportId?: string; token?: string; sample?: boolean }) {
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState(true);
  const [portrait, setPortrait] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const snapshot = buildShareSnapshot(preview, metrics);
  useEffect(() => {
    if (!open || !reportId || sample) return;
    let active = true;
    fetch(`/api/reports/${reportId}/share`, { headers: { "x-report-token": token } }).then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json() as { shareId: string | null };
      if (active) { setShareId(data.shareId); setExistingLoaded(true); }
    }).catch(() => { if (active) setNotice("Couldn’t check existing links. Images still work; reopen to retry."); });
    return () => { active = false; };
  }, [open, reportId, token, sample]);
  const image = async (share: boolean) => {
    setBusy(true); setNotice("");
    try {
      const blob = await renderShareImage(snapshot, portrait, sample);
      const file = new File([blob], "whathethinks-result.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        track("share_intent", { method: "image", sample }, reportId);
        await navigator.share({ files: [file], title: "My WhatHeThinks summary" });
        track("share_completed", { method: "image", sample }, reportId);
        setNotice("Share dialog completed.");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        track("card_download", { format: portrait ? "portrait" : "square", sample }, reportId);
        setNotice(share ? "File sharing isn’t supported here. Your image download has started." : "Image download started.");
      }
    } catch (e) { setNotice(e instanceof Error && e.name === "AbortError" ? "Sharing cancelled." : "Couldn’t export the image. Please try again."); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!reportId || sample) return;
    setBusy(true); setNotice("");
    try {
      const r = await fetch(`/api/reports/${reportId}/share`, { method: "POST", headers: { "content-type": "application/json", "x-report-token": token }, body: JSON.stringify({ showMetrics: metrics }) });
      if (!r.ok) throw new Error();
      const data = await r.json() as { shareId: string };
      setShareId(data.shareId);
      track("share_link_created", {}, reportId);
      setNotice("Summary published. The link expires in 30 days. Copy it below.");
    } catch { setNotice("Couldn’t publish the link. Please try again."); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/reports/${reportId}/share`, { method: "DELETE", headers: { "x-report-token": token } });
      if (!r.ok) throw new Error();
      setShareId(null); setNotice("Link revoked. Saved images and external previews cannot be recalled."); track("share_revoked", {}, reportId);
    } catch { setNotice("Couldn’t revoke the link. Please try again."); }
    finally { setBusy(false); }
  };
  const link = shareId && typeof window !== "undefined" ? `${window.location.origin}/s/${shareId}` : "";
  return <section className="v3-share-composer"><div className="v3-share-heading"><div><h2>A finding worth a second opinion?</h2><p>Share a little. Keep the messages private.</p></div><button type="button" className="btn-secondary" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) track("card_preview", { sample }, reportId); }}>{open ? "Close preview" : "Share my result ↗"}</button></div>
    {open && <div className="v3-share-editor"><div className={portrait ? "v3-card-preview is-portrait" : "v3-card-preview"}><ShareCard snapshot={snapshot} sample={sample} /></div><div className="v3-share-controls"><label><input type="checkbox" checked={metrics} onChange={e => setMetrics(e.target.checked)} disabled={busy} /> Include my two statistics</label><label>Image format<select value={portrait ? "portrait" : "square"} onChange={e => setPortrait(e.target.value === "portrait")} disabled={busy}><option value="portrait">Story · 9:16</option><option value="square">Square · 1:1</option></select></label><p className="v3-fine">Only the summary shown here is shared. No names, dates, messages or private report link.</p><div className="v3-button-row"><button type="button" className="btn-primary" disabled={busy} onClick={() => void image(true)}>Share image</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => void image(false)}>Download PNG</button></div>
    {!sample && reportId && <div className="v3-share-link"><p>Publishing makes this summary visible to anyone with the link for 30 days. {shareId && "Update the published link to apply your current selection."}</p><button type="button" className="btn-secondary" disabled={busy || !existingLoaded} onClick={() => void publish()}>{shareId ? "Update published summary" : "Publish summary link"}</button>{shareId && <><label>Public summary link<input readOnly value={link} onFocus={e => e.target.select()} /></label><div className="v3-button-row"><button type="button" className="btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); setNotice("Link copied."); } catch { setNotice("Select and copy the link above."); } }}>Copy link</button><button type="button" className="v3-danger-link" disabled={busy} onClick={() => void revoke()}>Revoke link</button></div></>}</div>}
    <p role="status" aria-live="polite">{busy ? "Working…" : notice}</p></div></div>}
  </section>;
}
