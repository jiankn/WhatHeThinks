import type { Metadata } from "next";
import { isQuestionId } from "@/lib/questions";
import { isChatPlatformId } from "@/lib/platforms";
import { AnalyzeFlow } from "./AnalyzeFlow";

export const metadata: Metadata = {
  title: "Analyze your chat",
  robots: { index: false, follow: true },
};

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string; stage?: string }>;
}) {
  const { q, platform } = await searchParams;
  return <AnalyzeFlow initialQuestion={isQuestionId(q) ? q : null} initialPlatform={isChatPlatformId(platform) ? platform : "whatsapp"} />;
}
