import type { Metadata } from "next";
import { ScenarioLanding } from "@/components/marketing/ScenarioLanding";
import { jsonLdHtml, SITE_NAME, SITE_URL } from "@/lib/site";
export const metadata: Metadata = {
  title: { absolute: "WhatHeThinks — Relationship Text Analyzer" },
  description: "Bring your WhatsApp chat. See the effort, mixed signals and changes in your conversation. Get a free preview, then decide on the full report.",
  alternates: { canonical: "/" },
};
export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml({ "@context": "https://schema.org", "@type": "WebApplication", name: SITE_NAME, url: SITE_URL, applicationCategory: "LifestyleApplication", operatingSystem: "Web" })} /><ScenarioLanding /></>;
}
