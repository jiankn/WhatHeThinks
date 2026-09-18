import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-line/70 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-30">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo />
        <Link
          href="/analyze"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-plum-soft"
        >
          Analyze a chat
        </Link>
      </div>
    </header>
  );
}
