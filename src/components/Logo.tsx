import Link from "next/link";

/** 文字标：衬线体 + 莓红句点（"receipts" 的收尾）。 */
export function Logo() {
  return (
    <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink" aria-label="WhatHeThinks home">
      WhatHeThinks<span className="text-rose">.</span>
    </Link>
  );
}
