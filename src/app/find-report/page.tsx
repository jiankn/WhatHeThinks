import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/Logo";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

export const metadata: Metadata = { title: "Find your reports", robots: { index: false, follow: false } };

export default async function FindReportPage() {
  return (
    <main className="auth-page auth-page-full auth-page-forgot">
      <div className="auth-page-brand"><Logo /></div>
      <div className="auth-page-art" aria-hidden="true"><span>Lost the link?<br />We will send it to your inbox. ♡</span></div>
      <AuthForm mode="recover" siteKey={await getTurnstileSiteKey()} />
    </main>
  );
}
