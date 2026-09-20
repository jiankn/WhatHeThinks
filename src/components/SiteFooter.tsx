"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SiteFooter() {
  const path = usePathname();
  if (["/analyze", "/setup", "/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return null;
  return <footer className="v3-footer"><p>© {new Date().getFullYear()} WhatHeThinks</p><nav aria-label="Footer">{[["/", "Home"], ["/account", "Account"], ["/faq", "FAQ"], ["/does-he-like-me-text-analyzer", "Does he like me?"], ["/mixed-signals-text-analyzer", "Mixed signals"], ["/who-texts-first", "Who texts first"], ["/reply-time-calculator", "Reply times"], ["/privacy", "Privacy"], ["/terms", "Terms"]].map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}</nav><p className="v3-fine">Perspective on texting patterns. Not access to someone’s thoughts.</p></footer>;
}
