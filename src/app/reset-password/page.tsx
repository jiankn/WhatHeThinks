import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/Logo";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || "";
  return (
    <main className="auth-page auth-page-full auth-page-reset">
      <div className="auth-page-brand"><Logo /></div>
      <div className="auth-page-art" aria-hidden="true"><span>Reset securely.<br />Then pick up where you left off. ♡</span></div>
      <AuthForm
        mode="reset"
        siteKey={await getTurnstileSiteKey()}
        resetToken={token}
        initialError={token ? "" : "This reset link is incomplete."}
      />
    </main>
  );
}
