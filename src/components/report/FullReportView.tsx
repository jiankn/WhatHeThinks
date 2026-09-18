"use client";

/** 完整报告：按 report.order 渲染 6 个模块，统一管理证据抽屉。 */

import { useCallback, useMemo, useState } from "react";
import { track } from "@/lib/events";
import type { FullReport, ModuleKey } from "@/lib/report/types";
import type { ReportView } from "@/lib/report/view";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { FollowUp } from "./FollowUp";
import {
  InterestModule,
  InvestmentModule,
  MixedModule,
  NextStepModule,
  SummaryModule,
  TimelineModule,
  type OpenEvidence,
} from "./modules";
import { PreviewSection } from "./PreviewSection";

export function FullReportView({ view, report, token }: { view: ReportView; report: FullReport; token: string }) {
  const [drawer, setDrawer] = useState<{ title: string; ids: number[]; splitAt?: number } | null>(null);
  const byId = useMemo(() => new Map((view.evidence ?? []).map((e) => [e.id, e])), [view.evidence]);
  const expired = (view.evidence ?? []).length === 0;

  const open: OpenEvidence = useCallback(
    (title, ids, splitAt) => {
      setDrawer({ title, ids, splitAt });
      track("evidence_open", { n: ids.length }, view.id);
    },
    [view.id],
  );

  const render = (key: ModuleKey, n: number) => {
    switch (key) {
      case "summary":
        return <SummaryModule key={key} r={report} open={open} n={n} />;
      case "interest":
        return <InterestModule key={key} r={report} open={open} n={n} />;
      case "investment":
        return <InvestmentModule key={key} r={report} open={open} n={n} />;
      case "timeline":
        return <TimelineModule key={key} r={report} open={open} n={n} />;
      case "mixedSignals":
        return <MixedModule key={key} r={report} open={open} n={n} />;
      case "nextStep":
        return <NextStepModule key={key} r={report} n={n} />;
    }
  };

  return (
    <div className="space-y-14">
      <PreviewSection preview={view.preview} compact />
      {report.order.map((key, i) => render(key, i + 1))}
      <FollowUp reportId={view.id} token={token} />

      {drawer && (
        <EvidenceDrawer
          title={drawer.title}
          messages={drawer.ids.map((id) => byId.get(id)).filter((m) => m !== undefined)}
          expired={expired}
          splitAt={drawer.splitAt}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
