import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/Logo";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage() {
  return (
    <main className="auth-page auth-page-full auth-page-forgot">
      <div className="auth-page-brand"><Logo /></div>
      <div className="auth-page-art" aria-hidden="true"><span>A fresh start should feel simple.<br />Your account stays private. ♡</span></div>
      <AuthForm mode="forgot" siteKey={await getTurnstileSiteKey()} />
    </main>
  );
}
