import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser, safeNextPath } from "@/lib/server/auth";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <main className="auth-page auth-page-full auth-page-signup">
      <div className="auth-page-brand"><Logo /></div>
      <div className="auth-page-art" aria-hidden="true"><span>Keep every insight close.<br />Stay in control. ♡</span></div>
      <AuthForm mode="signup" siteKey={await getTurnstileSiteKey()} next={next} />
    </main>
  );
}
