import type { Metadata } from "next";
import { SampleReport } from "./SampleReport";

export const metadata: Metadata = { title: "Sample report", robots: { index: false, follow: true } };

export default async function SampleReportPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  return <SampleReport preview={preview === "1"} />;
}
