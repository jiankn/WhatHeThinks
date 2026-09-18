import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** /r/ 与 /analyze 通过页面上的 noindex 排除，不在这里屏蔽（屏蔽抓取会让 noindex 失效）。 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
