"use client";
import Link from "next/link";
import { LockIcon } from "@/components/icons";
import { SKUS } from "@/lib/pricing";

/**
 * 付款入口：一个写着价格的按钮，点了直接去 Stripe。立即交付的同意在 Stripe 付款页勾选（见 lib/server/stripe.ts），
 * 这里只说清楚付款后会怎样。示例页不收款，按钮换成去看完整示例。
 */
export function CheckoutButton({ busy = false, error = null, onUnlock, sample = false }: {
  busy?: boolean; error?: string | null; onUnlock?: () => void; sample?: boolean;
}) {
  const price = SKUS.full_report.label;
  return <div className="checkout">
    {sample
      ? <Link href="/sample-report" className="btn-primary checkout-button"><LockIcon /> Read the full example</Link>
      : <button type="button" id="checkout" className="btn-primary checkout-button" onClick={onUnlock} disabled={busy}>
        <LockIcon /> {busy ? "Opening secure checkout…" : <>Read the full report · {price}</>}
      </button>}
    <p className="checkout-fine">
      {sample
        ? "Fictional example. You won't be charged."
        : <>One-time payment · Opens right here after payment · Full refund if it can&apos;t be written. <Link href="/terms">Terms</Link></>}
    </p>
    {error && <p role="alert" className="v3-error">{error}</p>}
  </div>;
}
