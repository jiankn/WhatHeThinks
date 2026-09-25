import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUIDES } from "@/content/guides";
import { LANDING_PAGES } from "@/content/landing";
import { INLINE_LINK, plainText } from "@/lib/inline-link";

/** 站内所有真实存在的页面。 */
const ROUTES = new Set([
  "/", ...GUIDES.map(g => `/${g.slug}`), ...LANDING_PAGES.map(p => `/${p.slug}`),
  "/who-texts-first", "/reply-time-calculator", "/guides", "/faq", "/sample-report", "/analyze", "/privacy", "/terms",
]);

/** 写着正文链接的源文件：内容文件与两个计算器页。 */
const SOURCES = [
  ...readdirSync("src/content").filter(f => f.endsWith(".ts")).map(f => `src/content/${f}`),
  "src/app/who-texts-first/page.tsx", "src/app/reply-time-calculator/page.tsx",
];

describe("正文里的站内链接", () => {
  it("每个链接都指向存在的页面", () => {
    const broken: string[] = [];
    for (const file of SOURCES) {
      for (const m of readFileSync(file, "utf8").matchAll(INLINE_LINK)) if (!ROUTES.has(m[2])) broken.push(`${file}: ${m[0]}`);
    }
    expect(broken).toEqual([]);
  });

  it("文章不链接到自己", () => {
    for (const g of GUIDES) {
      const text = [g.intro, ...g.sections.flatMap(s => s.paragraphs), ...g.faq.map(f => f.a)].join(" ");
      for (const m of text.matchAll(INLINE_LINK)) expect(m[2], g.slug).not.toBe(`/${g.slug}`);
    }
  });

  it("去掉链接标记后只留锚文字", () => {
    expect(plainText("Read [what ghosting means](/ghosting) first.")).toBe("Read what ghosting means first.");
  });
});
