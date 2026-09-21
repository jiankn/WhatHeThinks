"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus("Copied"); }
    catch { setStatus("Select the text to copy it."); }
  }
  return <span className="guide-copy"><button type="button" onClick={copy} aria-label={label === "Copy" ? `Copy: ${text}` : label}>{label}</button><span role="status">{status}</span></span>;
}
export function CopyMessage({ text }: { text: string }) {
  return <div className="guide-message"><p>{text}</p><CopyButton text={text} /></div>;
}
