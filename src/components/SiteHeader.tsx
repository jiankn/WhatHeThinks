"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
export function SiteHeader() {
  const path = usePathname();
  if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return null;
  const setup = path === "/analyze" || path === "/setup";
  return <header className="v3-header"><Logo /><nav aria-label="Main navigation">{setup ? <Link href="/" aria-label="Close setup" className="v3-close">×</Link> : <><Link href="/sample-report" className="v3-nav-sample">Sample report</Link><Link href="/account">Account</Link><Link href="/analyze" className="v3-nav-start">Try it now <span aria-hidden="true">↗</span></Link></>}</nav></header>;
}
