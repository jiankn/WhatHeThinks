/** 站点级常量与 JSON-LD 工具。 */

export const SITE_URL = (process.env.SITE_URL ?? "https://whathethinks.com").replace(/\/$/, "");
export const SITE_NAME = "WhatHeThinks";
export const SOCIAL_IMAGE = {
  url: "/images/social-card.webp",
  width: 1200,
  height: 630,
  alt: "WhatHeThinks. Read the pattern behind his texts.",
};

/** 服务端渲染 JSON-LD：必须用 JSON.stringify，并转义 "<" 防止提前闭合 script。 */
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}
