"use client";

import { useState } from "react";
import { UploadIcon } from "@/components/icons";

/** 选择/拖入 WhatsApp 导出文件的上传框（免费工具与落地页共用）。 */
export function ChatDropzone({ busy, onFile }: { busy: boolean; onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed bg-card px-6 py-10 text-center transition hover:border-rose/50 ${dragging ? "border-rose bg-rose-soft" : "border-line"} ${busy ? "pointer-events-none opacity-60" : ""}`}
      aria-busy={busy}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
        <UploadIcon />
      </span>
      <span className="mt-3 font-semibold">{busy ? "Reading your chat…" : "Choose your WhatsApp chat file"}</span>
      <span className="mt-1 text-sm text-muted">.txt or .zip, exported without media</span>
      <input
        type="file"
        accept=".txt,.zip,text/plain,application/zip"
        className="sr-only"
        aria-label="Choose a WhatsApp chat export"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
