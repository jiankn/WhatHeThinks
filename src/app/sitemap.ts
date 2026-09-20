/**
 * 站点地图：只列出希望被索引的页面（法律/工具性页面不列入）。
 * lastModified 用真实的内容更新时间，而不是构建时间。
 */

import type { MetadataRoute } from "next";
import { LANDING_PAGES, LANDING_UPDATED } from "@/content/landing";
import { SITE_URL } from "@/lib/site";

const HOME_UPDATED = "2026-09-18";
const TOOLS_UPDATED = "2026-09-19";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(HOME_UPDATED) },
    ...LANDING_PAGES.map((p) => ({ url: `${SITE_URL}/${p.slug}`, lastModified: new Date(LANDING_UPDATED) })),
    { url: `${SITE_URL}/who-texts-first`, lastModified: new Date(TOOLS_UPDATED) },
    { url: `${SITE_URL}/reply-time-calculator`, lastModified: new Date(TOOLS_UPDATED) },
    { url: `${SITE_URL}/faq`, lastModified: new Date(HOME_UPDATED) },
  ];
}
