/**
 * 隐私政策（草稿）。内容必须与实际架构一致：见 docs/PRD.md §5.3、§5.7、§7。
 * 注意：上线前仍需按目标市场和最终服务商配置完成法务审核。
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/marketing/Prose";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WhatHeThinks handles your chat: local analysis, limited redacted excerpts, 30-day deletion, AI processing and your deletion controls.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Prose eyebrow="Privacy" title="Privacy Policy" updated="2026-09-24">
      <p>
        WhatHeThinks is built to minimize how much of your conversation leaves your device. This policy explains exactly
        what happens to your data. The short version: <strong>your full chat export never leaves your device</strong>,
        but statistics and up to 120 redacted excerpts are sent to create and support your report. You can delete the
        stored report data at any time.
      </p>

      <h2>What happens on your device</h2>
      <p>
        When you upload or paste a chat, it is read, parsed and analyzed inside your web browser. The full conversation
        is never sent to our servers. The analysis only uses “You” and “Him”. The one exception: the first word of your
        own name as it appears in the chat is sent with your report so it can address you by name. His name never leaves
        your device.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Statistics about the chat</strong> — for example message counts, reply times, who started
          conversations, weekly trends and the turning points we detected.
        </li>
        <li>
          <strong>Up to 120 example messages</strong>, each shortened to 300 characters, used as evidence in your report.
          Before they leave your device, names, email addresses, phone numbers and links are replaced.
        </li>
        <li>
          <strong>Your first name</strong>, taken from your chat display name, so your report can speak to you by name. It
          is never included in a shared summary. His name is not stored.
        </li>
        <li>
          <strong>The question you chose</strong> and, if you wrote one, your custom question.
        </li>
        <li>
          <strong>Your email address</strong>, if you pay (so we can send your report link) or leave a follow-up question.
        </li>
        <li>
          <strong>Optional account details</strong> — your email address, name, and, if you use Google sign-in, your
          Google account identifier and profile image. If you use a password, we store a salted password hash, never the
          password itself.
        </li>
        <li>
          <strong>Sign-in and password-reset records</strong> — short-lived reset tokens and account sessions. The
          tokens stored in our database are hashed and expire automatically.
        </li>
        <li>
          <strong>Basic usage events</strong> — such as “preview viewed” or “checkout started” — with no chat content, to
          understand how the product is used.
        </li>
      </ul>
      <p>
        Your report is protected by a private key that is part of your report link. We store only a scrambled (hashed)
        version of that key, so we can't reconstruct your link from our database. Your browser also saves the key locally
        so you can reopen the report.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Example messages are deleted automatically 30 days after your report is created.</li>
        <li>Your report's statistics and findings are kept until you delete the report.</li>
        <li>Account sessions expire after 30 days. Password-reset links expire after one hour and work once.</li>
        <li>Payment records (amount, date and payment reference) are kept as required for accounting. They contain no chat content.</li>
      </ul>

      <h2>Sharing is your choice</h2>
      <p>Reports are private by default. You can download an image or explicitly publish a selected summary. The summary contains a general finding and, if you choose, two statistics. It never includes names, message excerpts, dates, or your private report key. Anyone with the summary link can view it for 30 days. Revoke it from the report at any time; deleting the report or account also removes the summary. Images already saved and previews cached by other services cannot be recalled.</p>
      <p>We use an anonymous session identifier in browser session storage to connect basic product events, referral sources and campaign labels. These events do not contain messages, questions you write, or private report keys. Downloading a card does not tell us whether you sent it to anyone.</p>

      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data.</li>
        <li>We never use your data for advertising or share it with advertisers.</li>
        <li>WhatHeThinks does not train its own AI models on your chat or report.</li>
        <li>We never log the content of your messages.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We use a small number of providers to run the service:</p>
      <ul>
        <li>
          <strong>Cloudflare</strong> — hosting, database and Turnstile security checks that help prevent automated abuse.
        </li>
        <li>
          <strong>DeepSeek</strong> — writing your English-language report. We send your selected or custom question,
          measured patterns, your first name and up to 120 redacted message excerpts to its API. This happens when your free
          preview opens, so the first page can be shown and the full report is ready the moment you unlock it; the full
          report is only shown after payment. We do not send your full export,
          payment details, account email or private report key. Avoid including identifying information in your custom question.
        </li>
        <li>
          <strong>Zhipu AI (GLM)</strong> — a backup writer, used only when DeepSeek cannot produce a valid report. It
          receives the same limited data described for DeepSeek, and nothing more.
        </li>
        <li>
          <strong>Stripe</strong> — payments. Your card details go directly to Stripe; we never see them.
        </li>
        <li>
          <strong>Google</strong> — optional account sign-in. Google receives the information needed to complete the
          sign-in flow, and we receive your verified email and basic profile details.
        </li>
        <li>
          <strong>Resend</strong> — sending report links and password-reset emails.
        </li>
      </ul>

      <h2>International data transfers</h2>
      <p>
        Cloudflare, DeepSeek, Zhipu AI, Stripe, Google and Resend may process data in countries other than the one where you live. Those
        countries may have different data-protection rules. Contact{" "}
        <a href="mailto:privacy@whathethinks.com">privacy@whathethinks.com</a> if you want more information about where
        your data is processed or the safeguards that apply.
      </p>

      <h2>Deleting your data</h2>
      <p>
        If you have an account, use <Link href="/account">My account</Link> to review and delete individual reports or
        delete the account and its stored report data. If you used WhatHeThinks without an account, you can still delete
        a report from its page or on the <Link href="/delete">private-link deletion page</Link>. Deletion is permanent.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We don't use advertising or tracking cookies. Your browser's local storage is used to remember the key to your
        report on this device. If you sign in, we use a secure, HTTP-only session cookie. Google sign-in briefly uses
        state and nonce cookies to complete the sign-in securely. Cloudflare Turnstile may process standard network and
        security signals to distinguish people from automated requests.
      </p>

      <h2>Age</h2>
      <p>WhatHeThinks is intended for people aged 18 and over.</p>

      <h2>Changes and contact</h2>
      <p>
        If we change how we handle data, we'll update this page and the date above. Questions or requests:{" "}
        <a href="mailto:privacy@whathethinks.com">privacy@whathethinks.com</a>.
      </p>
    </Prose>
  );
}
