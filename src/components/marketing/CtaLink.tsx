import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { QuestionId } from "@/lib/questions";

/** 进入分析流程的主 CTA；落地页带上预选问题。 */
export function CtaLink({ q, children, className = "" }: { q?: QuestionId | null; children: React.ReactNode; className?: string }) {
  return (
    <Link href={q ? `/analyze?q=${q}` : "/analyze"} className={`btn-primary ${className}`}>
      {children} <ArrowRightIcon />
    </Link>
  );
}

export function CtaNote() {
  return <p className="mt-2 text-sm text-muted">Free preview · No card required · Your full chat never leaves your device</p>;
}
