import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser, safeNextPath } from "@/lib/server/auth";
import { getTurnstileSiteKey } from "@/lib/server/turnstile";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const query = await searchParams;
  const next = safeNextPath(query.next);
  if (await getCurrentUser()) redirect(next);
  const initialError = query.error
    ? query.error === "google-not-configured"
      ? "Google sign-in is not configured yet. Use email and password."
      : "Google sign-in could not be completed. Please try again."
    : query.reset === "success"
      ? "Password updated. Sign in with your new password."
      : "";
  return (
    <main className="auth-page auth-page-full">
      <div className="auth-page-brand"><Logo /></div>
      <div className="auth-page-art" aria-hidden="true"><span>One place for your reports.<br />Your data stays yours. ♡</span></div>
      <AuthForm mode="login" siteKey={await getTurnstileSiteKey()} next={next} initialError={initialError} />
    </main>
  );
}
