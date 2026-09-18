/**
 * 隐私政策（草稿）。内容必须与实际架构一致：见 docs/PRD.md §5.3、§5.7、§7。
 * 注意：上线前需法务审核；接入真实 LLM 后要补充 AI 服务商条款。
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/marketing/Prose";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WhatHeThinks handles your chat: analyzed on your device, minimal data stored, examples deleted after 30 days, never sold or used for training.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Prose eyebrow="Privacy" title="Privacy Policy" updated="2026-09-18">
      <p>
        WhatHeThinks is built so that your conversation stays with you. This policy explains exactly what happens to
        your data. The short version: <strong>your full chat never leaves your device</strong>, we store only what we
        need to show you your report, and you can delete it at any time.
      </p>

      <h2>What happens on your device</h2>
      <p>
        When you upload or paste a chat, it is read, parsed and analyzed inside your web browser. The full conversation
        is never sent to our servers. Participant names stay on your device — the analysis only uses “You” and “Him”.
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
          <strong>The question you chose</strong> and, if you wrote one, your custom question.
        </li>
        <li>
          <strong>Your email address</strong>, if you pay (so we can send your report link) or leave a follow-up question.
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
        <li>Payment records (amount, date and payment reference) are kept as required for accounting. They contain no chat content.</li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data.</li>
        <li>We never use your data for advertising or share it with advertisers.</li>
        <li>We never use your messages to train AI models.</li>
        <li>We never log the content of your messages.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We use a small number of providers to run the service:</p>
      <ul>
        <li>
          <strong>Cloudflare</strong> — hosting and database.
        </li>
        <li>
          <strong>Stripe</strong> — payments. Your card details go directly to Stripe; we never see them.
        </li>
        <li>
          <strong>Resend</strong> — sending your report link by email.
        </li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        You can delete a report at any time from the bottom of the report page, or on the{" "}
        <Link href="/delete">delete my data</Link> page using your report link. Deletion is permanent and removes the
        report, its statistics and its example messages.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We don't use advertising or tracking cookies. Your browser's local storage is used to remember the key to your
        report on this device.
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
