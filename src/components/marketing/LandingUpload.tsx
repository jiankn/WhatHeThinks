"use client";

/**
 * 落地页首屏的上传框：选好文件后跳到 /analyze（带上预设问题），由那边接着解析，
 * 用户直接看到"哪个是你"这一步，不必再选一次文件。
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockIcon } from "@/components/icons";
import { ChatDropzone } from "@/components/upload/ChatDropzone";
import { ExportHelp } from "@/components/upload/ExportHelp";
import { setPendingChat } from "@/lib/pending-chat";
import type { QuestionId } from "@/lib/questions";

export function LandingUpload({ q }: { q: QuestionId | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const href = q ? `/analyze?q=${q}` : "/analyze";

  const onFile = (f: File) => {
    setBusy(true);
    setPendingChat(f);
    router.push(href);
  };

  return (
    <div>
      <ChatDropzone busy={busy} onFile={onFile} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5" /> Free preview · Your full chat stays on your device
        </span>
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center underline underline-offset-2 hover:text-ink">
          Paste text instead
        </Link>
      </div>
      <ExportHelp />
      <p className="mt-3 text-xs text-faint">
        By continuing, you confirm you&apos;re part of this chat and agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  );
}
