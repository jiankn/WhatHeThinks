/** 站点级常量与 JSON-LD 工具。 */

export const SITE_URL = (process.env.SITE_URL ?? "https://whathethinks.com").replace(/\/$/, "");
export const SITE_NAME = "WhatHeThinks";

/** 服务端渲染 JSON-LD：必须用 JSON.stringify，并转义 "<" 防止提前闭合 script。 */
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}
