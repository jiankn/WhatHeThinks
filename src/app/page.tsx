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
  const homepageUrl = `${SITE_URL}/`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: homepageUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: homepageUrl,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: homepageUrl,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
      },
    ],
  };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(structuredData)} /><ScenarioLanding /></>;
}
