"use client";
import Link from "next/link";
import { PreviewHeading } from "@/components/report/PreviewSection";
import { PreviewTeaser } from "@/components/report/PreviewTeaser";
import { CheckoutButton } from "@/components/report/Paywall";
import { SampleReportStory } from "./SampleReportStory";
import { sampleReport, sampleTeaser } from "@/lib/report/sample";
export function SampleReport({ preview }: { preview: boolean }) {
  if (!preview) return <SampleReportStory />;
  return <main className="reader-shell"><PreviewHeading preview={sampleReport.preview} sample /><PreviewTeaser data={sampleTeaser} checkout={() => <CheckoutButton sample />} /><div className="reader-end"><Link href="/analyze" className="btn-primary">Get my free preview ↗</Link></div></main>;
}
