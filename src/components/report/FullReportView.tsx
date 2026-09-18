"use client";

import type { FullReport } from "@/lib/report/types";
import type { ReportView } from "@/lib/report/view";

/** 完整报告（M4 实现）。 */
export function FullReportView(_: { view: ReportView; report: FullReport; token: string }) {
  return <p className="text-muted">Full report coming in M4.</p>;
}
