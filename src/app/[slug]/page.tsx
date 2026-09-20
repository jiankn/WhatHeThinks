import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScenarioLanding } from "@/components/marketing/ScenarioLanding";
import { getLanding, LANDING_PAGES } from "@/content/landing";
import { jsonLdHtml, SITE_NAME, SITE_URL, SOCIAL_IMAGE } from "@/lib/site";
export const dynamicParams = false;
export function generateStaticParams() { return LANDING_PAGES.map(p => ({ slug: p.slug })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getLanding((await params).slug);
  if (!p) return {};
  return { title: { absolute: p.title }, description: p.description, alternates: { canonical: `/${p.slug}` }, openGraph: { title: p.title, description: p.description, url: `/${p.slug}`, images: [SOCIAL_IMAGE] } };
}
export default async function LandingPage({ params }: Props) {
  const page = getLanding((await params).slug);
  if (!page) notFound();
  return <><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL }, { "@type": "ListItem", position: 2, name: page.eyebrow, item: `${SITE_URL}/${page.slug}` }] })} /><ScenarioLanding page={page} /></>;
}
