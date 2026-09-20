import Link from "next/link";
import { LockIcon } from "@/components/icons";

const PROMISES = [
  ["Private by default", "Your chat is read on your device. The full conversation is never uploaded."],
  ["Minimal data", "Only statistics and up to 120 example messages — names, emails and numbers removed."],
  ["Auto-deleted", "Example messages are deleted after 30 days. Delete everything anytime."],
  ["Never sold or used for ads", "Your data isn't sold, shared with advertisers or used to target you."],
] as const;

export function PrivacyPromises() {
  return (
    <section className="rounded-[var(--radius-card)] bg-plum px-5 py-8 text-paper sm:px-8" aria-labelledby="privacy-title">
      <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-rose-soft/80 uppercase">
        <LockIcon className="h-3.5 w-3.5" /> Privacy by architecture
      </p>
      <h2 id="privacy-title" className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
        Your chat stays yours.
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {PROMISES.map(([t, d]) => (
          <li key={t}>
            <p className="font-semibold">{t}</p>
            <p className="mt-0.5 text-sm text-paper/75">{d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-paper/75">
        Read exactly what we store in our{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-paper">
          privacy policy
        </Link>
        .
      </p>
    </section>
  );
}
