import type { Metadata } from "next";
import { ScenarioLanding } from "@/components/marketing/ScenarioLanding";
import { jsonLdHtml, SITE_NAME, SITE_URL } from "@/lib/site";
export const metadata: Metadata = {
  title: { absolute: "What He Thinks — AI Text Message Analyzer" },
  description: "Analyze your relationship texts for effort, mixed signals and changes over time. Upload a WhatsApp export or paste messages. Start with a free preview.",
  openGraph: { title: "What He Thinks — AI Text Message Analyzer", description: "Explore effort, mixed signals and changes in your relationship conversations.", url: "/" },
  twitter: { title: "What He Thinks — AI Text Message Analyzer", description: "Explore effort, mixed signals and changes in your relationship conversations." },
  alternates: { canonical: "/" },
};
export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml({ "@context": "https://schema.org", "@type": "WebApplication", name: SITE_NAME, url: SITE_URL, applicationCategory: "LifestyleApplication", operatingSystem: "Web" })} /><ScenarioLanding /></>;
}
