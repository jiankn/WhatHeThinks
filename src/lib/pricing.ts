/**
 * 定价集中在此。价格只在用户看完免费预览后的付费墙展示。
 */

export const SKUS = {
  full_report: { sku: "full_report", cents: 1990, label: "$19.90", name: "WhatHeThinks Full Report" },
} as const;

export type SkuId = keyof typeof SKUS;
