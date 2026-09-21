import type { Metadata, Viewport } from "next";
import { Caveat, Geist, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_NAME, SOCIAL_IMAGE } from "@/lib/site";
import "./globals.css";
import "./account.css";
import "./experience.css";
import "./guides.css";
import { VisitTracker } from "@/components/VisitTracker";

const inter = Geist({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });
const handwriting = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap", weight: ["500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://whathethinks.com"),
  title: {
    default: "WhatHeThinks — See When His Texting Changed",
    template: "%s | WhatHeThinks",
  },
  description:
    "Upload your WhatsApp chat and see what his texting behavior is actually showing: who initiates, how much effort he gives, and the week things changed. Private by default.",
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  openGraph: {
    title: "WhatHeThinks — Read the Pattern Behind His Texts",
    description: "Analyze a WhatsApp chat to see who reaches out, how effort shifts, and when his texting changes. Free private preview.",
    type: "website",
    siteName: SITE_NAME,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatHeThinks — Read the Pattern Behind His Texts",
    description: "Analyze a WhatsApp chat to see who reaches out, how effort shifts, and when his texting changes.",
    images: [SOCIAL_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${handwriting.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <VisitTracker />
        <div id="main-content" className="flex-1" tabIndex={-1}>{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
