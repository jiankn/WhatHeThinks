"use client";
import Link from "next/link";
import { PreviewHeading, PreviewSection } from "@/components/report/PreviewSection";
import { Paywall } from "@/components/report/Paywall";
import { SampleReportStory } from "./SampleReportStory";
import { sampleReport } from "@/lib/report/sample";
export function SampleReport({ preview }: { preview: boolean }) {
  if (!preview) return <SampleReportStory />;
  return <main className="reader-shell"><PreviewHeading preview={sampleReport.preview} sample /><PreviewSection preview={sampleReport.preview} /><Paywall preview={sampleReport.preview} busy={false} error={null} onUnlock={() => {}} sample /><div className="reader-end"><Link href="/analyze" className="btn-primary">Get my free preview ↗</Link></div></main>;
}
