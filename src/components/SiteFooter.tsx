import Link from "next/link";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/tools/who-texts-first", label: "Who texts first" },
  { href: "/tools/reply-time-calculator", label: "Reply time calculator" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/delete", label: "Delete my data" },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            We analyze his texting behavior — not his mind. Patterns, not predictions. Not therapy or professional
            advice.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted sm:justify-end" aria-label="Footer">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-faint">© {new Date().getFullYear()} WhatHeThinks</p>
    </footer>
  );
}
