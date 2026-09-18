import type { Metadata } from "next";
import { ReportClient } from "./ReportClient";

export const metadata: Metadata = {
  title: "Your report",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportClient id={id} />;
}
