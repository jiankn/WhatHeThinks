"use client";
import { useEffect, useMemo, useState } from "react";
import type { Preview } from "@/lib/analysis/analysis-types";
import { buildShareSnapshot } from "@/lib/report/share";
import { renderShareImage } from "@/lib/report/share-image";
import { track } from "@/lib/events";

/** reportHeadline：付费报告的标题；只有传入时才出现“显示报告标题”的选项。 */
export function ShareResult({ preview, reportId, token = "", sample = false, reportHeadline }: { preview: Preview; reportId?: string; token?: string; sample?: boolean; reportHeadline?: string }) {
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState(true);
  const [headline, setHeadline] = useState(true);
  const quote = headline && reportHeadline ? reportHeadline : null;
  const [portrait, setPortrait] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [publicOpen, setPublicOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [generationError, setGenerationError] = useState("");
  const [asset, setAsset] = useState<{ key: string; file: File; url: string; canShare: boolean } | null>(null);
  const snapshot = useMemo(() => buildShareSnapshot(preview, metrics, quote), [preview, metrics, quote]);
  const imageKey = JSON.stringify([snapshot, portrait, sample]);
  const ready = asset?.key === imageKey ? asset : null;
  useEffect(() => {
    if (!open) return;
    let active = true;
    let url: string | undefined;
    setAsset(null);
    setGenerationError("");
    renderShareImage(snapshot, portrait, sample).then(blob => {
      if (!active) return;
      const file = new File([blob], "whathethinks-result.png", { type: "image/png" });
      url = URL.createObjectURL(blob);
      let canShare = false;
      try { canShare = typeof navigator.share === "function" && navigator.canShare?.({ files: [file] }) === true; } catch { /* Download remains available. */ }
      setAsset({ key: imageKey, file, url, canShare });
    }).catch(() => {
      if (active) setGenerationError("Couldn’t prepare your image. Please try again.");
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [open, snapshot, portrait, sample, imageKey, retry]);
  useEffect(() => {
    if (!open || !publicOpen || !reportId || sample) return;
    let active = true;
    setExistingLoaded(false);
    fetch(`/api/reports/${reportId}/share`, { headers: { "x-report-token": token } }).then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json() as { shareId: string | null };
      if (active) { setShareId(data.shareId); setExistingLoaded(true); }
    }).catch(() => { if (active) setNotice("Couldn’t check existing links. Close and reopen the public link section to retry."); });
    return () => { active = false; };
  }, [open, publicOpen, reportId, token, sample]);
  const image = async (share: boolean) => {
    if (!ready) return;
    setBusy(true); setNotice("");
    try {
      if (share && ready.canShare) {
        track("share_intent", { method: "image", sample }, reportId);
        // The file is already prepared; call share during the user's click.
        await navigator.share({ files: [ready.file], title: "My WhatHeThinks summary" });
        track("share_completed", { method: "image", sample }, reportId);
        setNotice("Share dialog completed.");
      } else {
        const url = URL.createObjectURL(ready.file);
        const a = document.createElement("a"); a.href = url; a.download = ready.file.name;
        document.body.appendChild(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        track("card_download", { format: portrait ? "portrait" : "square", sample }, reportId);
        setNotice("Image download started.");
      }
    } catch (e) { setNotice(e instanceof Error && e.name === "AbortError" ? "Sharing cancelled." : "Couldn’t export the image. Please try again."); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!reportId || sample) return;
    setBusy(true); setNotice("");
    try {
      const r = await fetch(`/api/reports/${reportId}/share`, { method: "POST", headers: { "content-type": "application/json", "x-report-token": token }, body: JSON.stringify({ showMetrics: metrics, showHeadline: Boolean(quote) }) });
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
  return <section className="v3-share-composer">
    <div className="v3-share-heading">
      <h2>Get a friend’s perspective.</h2>
      <p>Share a summary. Keep your conversation private.</p>
      <button type="button" className="btn-secondary" aria-expanded={open} disabled={busy} onClick={() => {
        setOpen(!open); setNotice(""); setAsset(null);
        if (!open) track("card_preview", { sample }, reportId);
      }}>{open ? "Close preview" : "Share my result ↗"}</button>
    </div>
    {open && <div className="v3-share-editor">
      <figure className={portrait ? "v3-card-preview is-portrait" : "v3-card-preview"} aria-busy={!ready && !generationError}>
        {ready ? <img src={ready.url} width={1080} height={portrait ? 1920 : 1080}
          alt={`${sample ? "Sample. " : ""}${snapshot.quote ? `What my report said: “${snapshot.quote}”` : snapshot.headline} ${snapshot.metrics.map(m => `${m.label}: ${m.value}.`).join(" ")} ${snapshot.note} WhatHeThinks.com`} />
          : <div className="v3-image-placeholder" role="status">{generationError || "Preparing your image…"}</div>}
        <figcaption>This is the exact image you’ll share or download.</figcaption>
      </figure>
      <div className="v3-share-controls">
        <fieldset className="v3-share-formats" disabled={busy}>
          <legend>Image format</legend>
          <div>{[false, true].map(value => <label key={String(value)}>
            <input type="radio" name={`share-format-${reportId || "sample"}`} checked={portrait === value}
              onChange={() => { setPortrait(value); setNotice(""); }} />
            <span>{value ? "Story · 9:16" : "Square · 1:1"}</span>
          </label>)}</div>
        </fieldset>
        {reportHeadline && <label className="v3-share-metrics"><input type="checkbox" checked={headline} onChange={e => { setHeadline(e.target.checked); setNotice(""); }} disabled={busy} /> Show my report’s headline</label>}
        <label className="v3-share-metrics"><input type="checkbox" checked={metrics} onChange={e => { setMetrics(e.target.checked); setNotice(""); }} disabled={busy} /> Show statistics</label>
        <p className="v3-fine">Only what you see in this image is shared. No names, messages or private report link.</p>
        <div className="v3-button-row">
          {ready?.canShare && <button type="button" className="btn-primary" disabled={busy} onClick={() => void image(true)}>Share image</button>}
          <button type="button" className={ready?.canShare ? "btn-secondary" : "btn-primary"} disabled={busy || !ready} onClick={() => void image(false)}>Download PNG</button>
          {generationError && <button type="button" className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry image</button>}
        </div>
        {!sample && reportId && <details className="v3-share-link" open={publicOpen} onToggle={e => setPublicOpen(e.currentTarget.open)}>
          <summary>{shareId ? "Manage public link" : "Create public link"}</summary>
          <div className="v3-share-link-content">
            <p>Anyone with this link can view your summary for 30 days. You can revoke the link anytime. Saved images cannot be recalled. {shareId && "Update the link to apply your current headline and statistics selection."}</p>
            <button type="button" className="btn-secondary" disabled={busy || !existingLoaded || !ready} onClick={() => void publish()}>{shareId ? "Update published summary" : "Create public link"}</button>
            {shareId && <>
              <label>Public summary link<input readOnly value={link} onFocus={e => e.target.select()} /></label>
              <div className="v3-button-row">
                <button type="button" className="btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); setNotice("Link copied."); } catch { setNotice("Select and copy the link above."); } }}>Copy link</button>
                <button type="button" className="v3-danger-link" disabled={busy} onClick={() => void revoke()}>Revoke link</button>
              </div>
            </>}
          </div>
        </details>}
        <p role="status" aria-live="polite">{busy ? "Working…" : notice}</p>
      </div>
    </div>}
  </section>;
}
