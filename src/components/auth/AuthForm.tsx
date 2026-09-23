"use client";

import Link from "next/link";
import { useState } from "react";
import { TurnstileWidget } from "./TurnstileWidget";

type Mode = "login" | "signup" | "forgot" | "reset" | "recover";

const COPY: Record<Mode, { title: string; intro: string; button: string }> = {
  login: { title: "Welcome back", intro: "Your reports and privacy controls, in one calm place.", button: "Sign in" },
  signup: { title: "Create your account", intro: "Keep reports together and manage stored data whenever you want.", button: "Create account" },
  forgot: { title: "Reset your password", intro: "We will email a private reset link if an account exists.", button: "Send reset link" },
  reset: { title: "Choose a new password", intro: "Use 10–128 characters. This reset link works once.", button: "Save new password" },
  recover: { title: "Find your reports", intro: "Enter the email you used at checkout. We will send fresh private links to your paid reports.", button: "Email my report links" },
};

export function AuthForm({
  mode,
  siteKey,
  next = "/account",
  resetToken = "",
  initialError = "",
}: {
  mode: Mode;
  siteKey: string;
  next?: string;
  resetToken?: string;
  initialError?: string;
}) {
  const [error, setError] = useState(initialError);
  const [working, setWorking] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    if ((mode === "signup" || mode === "reset") && password !== String(data.get("confirmPassword") || "")) {
      setError("The passwords do not match.");
      return;
    }
    const turnstileToken = String(data.get("cf-turnstile-response") || "");
    if (!turnstileToken) {
      setError("Complete the security check first.");
      return;
    }
    setWorking(true);
    setError("");
    const endpoint = mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : mode === "recover" ? "recover-reports" : mode;
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password,
        token: resetToken,
        turnstileToken,
        next,
      }),
    }).catch(() => null);
    const result = response ? ((await response.json().catch(() => ({}))) as { error?: string; next?: string }) : {};
    setWorking(false);
    if (!response?.ok) {
      setError(result.error || "Something went wrong. Please try again.");
      window.turnstile?.reset();
      return;
    }
    if (mode === "forgot" || mode === "recover") {
      setSent(true);
      return;
    }
    if (mode === "reset") {
      window.location.assign("/login?reset=success");
      return;
    }
    window.location.assign(result.next || next);
  };

  if (sent) {
    return (
      <section className="auth-card auth-success" aria-live="polite">
        <span className="auth-success-mark" aria-hidden="true">✓</span>
        <h1>Check your inbox</h1>
        <p>{mode === "recover"
          ? "If we find paid reports for that address, fresh private links are on their way. Links emailed earlier stop working."
          : "If an account exists for that address, a one-hour reset link is on its way."}</p>
        <Link href={mode === "recover" ? "/" : "/login"} className="btn-primary">{mode === "recover" ? "Back to home" : "Back to sign in"}</Link>
      </section>
    );
  }

  const copy = COPY[mode];
  return (
    <section className="auth-card">
      <Link href="/" className="auth-home-link" aria-label="Back to WhatHeThinks home">
        <span aria-hidden="true">←</span> Home
      </Link>
      <div className="auth-card-heading">
        <p className="eyebrow">{mode === "recover" ? "No account needed" : "Your private space"}</p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </div>

      {(mode === "login" || mode === "signup") && (
        <>
          <Link href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} className="auth-google">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/>
              <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/>
              <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"/>
              <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.8 9.4 6 12 6Z"/>
            </svg>
            Continue with Google
          </Link>
          <div className="auth-divider"><span>or use email</span></div>
        </>
      )}

      <form onSubmit={submit} className="auth-form">
        {mode === "signup" && (
          <label>
            <span>Name <small>Optional</small></span>
            <input name="name" type="text" autoComplete="name" maxLength={80} />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {(mode === "login" || mode === "signup" || mode === "reset") && (
          <label>
            <span>{mode === "reset" ? "New password" : "Password"}</span>
            <input
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? undefined : 10}
              maxLength={128}
              required
            />
          </label>
        )}
        {(mode === "signup" || mode === "reset") && (
          <label>
            <span>Confirm password</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required />
          </label>
        )}
        {mode === "login" && (
          <><Link href="/forgot-password" className="auth-forgot">Forgot password?</Link> <Link href="/find-report" className="auth-forgot">Lost a report link?</Link></>
        )}
        <TurnstileWidget siteKey={siteKey} />
        <div className="auth-form-error" aria-live="polite">{error && <p>{error}</p>}</div>
        <button className="btn-primary auth-submit" disabled={working || !siteKey}>
          {working ? "Please wait…" : copy.button}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login" && <>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>}
        {mode === "signup" && <>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login">Back to sign in</Link>}
        {mode === "recover" && <>Have an account? <Link href="/login?next=%2Faccount">Sign in to see your reports</Link></>}
      </p>
    </section>
  );
}
