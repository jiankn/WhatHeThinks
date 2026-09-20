import type { Metadata } from "next";
import Link from "next/link";
import { readShare } from "@/lib/server/shares";
import { ShareCard } from "@/components/report/ShareCard";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const snapshot = await readShare(id);
  return { title: snapshot ? "A shared finding" : "Share unavailable", robots: { index: false, follow: false }, referrer: "no-referrer", openGraph: { title: "A finding from WhatHeThinks", description: "What does your conversation look like? Get your own free preview.", images: snapshot ? [{ url: `${SITE_URL}/s/${id}/image`, width: 1200, height: 630 }] : [] } };
}
export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const snapshot = await readShare(id);
  if (!snapshot) return <main className="v3-share-page"><h1>This share is no longer available.</h1><p>It may have expired or been removed by its owner.</p><Link href="/analyze" className="btn-primary">Analyze your own chat</Link></main>;
  return <main className="v3-share-page"><span className="v3-tag">Someone shared a finding with you</span><ShareCard snapshot={snapshot} /><h1>What does your chat look like?</h1><p>Start with your own conversation. Your free preview is private until you choose to share.</p><Link href={`/analyze?utm_source=share&utm_medium=referral&utm_campaign=result&ref=${id}`} className="btn-primary">Get my free preview ↗</Link><p className="v3-fine">This is a selected summary, not access to the original report or messages.</p></main>;
}
