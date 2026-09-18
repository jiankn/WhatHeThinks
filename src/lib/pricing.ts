/**
 * 定价集中在此，便于之后做 $9.99 vs $12.99 A/B（BP §27、PRD §5.6）。
 */

export const SKUS = {
  full_report: { sku: "full_report", cents: 999, label: "$9.99", name: "WhatHeThinks Full Report" },
} as const;

export type SkuId = keyof typeof SKUS;
