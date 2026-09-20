"use client";
import Link from "next/link";
import { PreviewHeading, PreviewSection } from "@/components/report/PreviewSection";
import { Paywall } from "@/components/report/Paywall";
import { FullReportView } from "@/components/report/FullReportView";
import { ShareResult } from "@/components/report/ShareResult";
import { sampleReport } from "@/lib/report/sample";
export function SampleReport({ preview }: { preview: boolean }) {
  if (!preview) return <FullReportView view={sampleReport} report={sampleReport.report!} token="" sample />;
  return <main className="reader-shell"><PreviewHeading preview={sampleReport.preview} sample /><PreviewSection preview={sampleReport.preview} /><Paywall preview={sampleReport.preview} busy={false} error={null} onUnlock={() => {}} sample /><ShareResult preview={sampleReport.preview} sample /><div className="reader-end"><Link href="/analyze" className="btn-primary">Analyze your own chat ↗</Link></div></main>;
}
