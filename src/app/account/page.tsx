import type { Metadata } from "next";
import Link from "next/link";
import { questionLabel, isQuestionId } from "@/lib/questions";
import { DeleteAccountButton, DeleteReportButton, SignOutButton } from "@/components/account/AccountActions";
import { getCurrentUser } from "@/lib/server/auth";
import { getDB } from "@/lib/server/env";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

type AccountReport = {
  id: string;
  question: string;
  status: string;
  created_at: number;
  paid_at: number | null;
};

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source.split(/[\s@]+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="account-page"><div className="account-empty"><span aria-hidden="true">💬</span><h1 className="text-3xl font-medium">Your conversations</h1><p>Sign in to see reports saved to your account. If you started as a guest, use your private report link on the same browser.</p><div className="v3-button-row"><Link href="/analyze" className="btn-primary">Analyze a new conversation</Link><Link href="/login?next=%2Faccount" className="btn-secondary">Sign in</Link></div></div></main>;
  const db = await getDB();
  const { results: reports } = await db
    .prepare(`SELECT id, question, status, created_at, paid_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`)
    .bind(user.id)
    .all<AccountReport>();

  return (
    <main className="account-page">
      <header className="account-welcome">
        <div className="account-avatar" aria-hidden="true">{initials(user.name, user.email)}</div>
        <div>
          <p className="eyebrow">My account</p>
          <h1>{user.name ? `Hi, ${user.name.split(" ")[0]}` : "Your private space"}</h1>
          <p>Manage reports, sign-in methods, and stored data.</p>
        </div>
        <SignOutButton />
      </header>

      <div className="account-grid">
        <section className="account-panel account-profile" aria-labelledby="profile-title">
          <div className="account-panel-heading">
            <p className="eyebrow">Profile</p>
            <h2 id="profile-title">Account details</h2>
          </div>
          <dl>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Sign-in</dt><dd>{[user.google_sub ? "Google" : "", user.password_hash ? "Email and password" : ""].filter(Boolean).join(" · ")}</dd></div>
            <div><dt>Email status</dt><dd>{user.email_verified_at ? "Verified" : "Not yet verified"}</dd></div>
          </dl>
          {user.password_hash ? <Link href="/forgot-password" className="account-text-link">Change password</Link> : null}
        </section>

        <section className="account-panel account-privacy" aria-labelledby="privacy-controls-title">
          <div className="account-panel-heading">
            <p className="eyebrow">Privacy controls</p>
            <h2 id="privacy-controls-title">Your data, under your control</h2>
          </div>
          <p>Your original chat export is processed in your browser. Reports store derived statistics and limited redacted examples.</p>
          <Link href="/privacy" className="account-text-link">Read the privacy policy</Link>
        </section>
      </div>

      <section className="account-reports" aria-labelledby="reports-title">
        <div className="account-section-heading">
          <div>
            <p className="eyebrow">Saved reports</p>
            <h2 id="reports-title">Your analysis history</h2>
          </div>
          <Link href="/analyze" className="btn-primary">Analyze another chat</Link>
        </div>
        {reports.length ? (
          <div className="account-report-list">
            {reports.map((report) => (
              <article className="account-report-row" key={report.id}>
                <div>
                  <span className={report.paid_at ? "account-report-status is-full" : "account-report-status"}>
                    {report.paid_at ? "Full report" : "Free preview"}
                  </span>
                  <h3>{report.question === "custom" ? "Your relationship question" : isQuestionId(report.question) ? questionLabel(report.question) : "Your conversation"}</h3>
                  <p>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(report.created_at))} · {report.status}</p>
                </div>
                <div className="account-report-actions">
                  <Link href={`/r/${report.id}`}>Open</Link>
                  <DeleteReportButton id={report.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="account-empty">
            <span aria-hidden="true">♡</span>
            <h3>No saved reports yet</h3>
            <p>Your next report will appear here automatically while you are signed in.</p>
            <Link href="/analyze" className="btn-primary">Analyze a chat</Link>
          </div>
        )}
      </section>

      <section className="account-danger-zone" aria-labelledby="danger-title">
        <div>
          <p className="eyebrow">Account deletion</p>
          <h2 id="danger-title">Delete your account and stored data</h2>
          <p>This permanently removes your account, sessions, reports, and stored example messages. Accounting records retain no chat content.</p>
          <Link href="/delete" className="account-legacy-link">Delete a report using a private link</Link>
        </div>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
