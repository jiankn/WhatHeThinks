/**
 * 服务条款（草稿）。注意：上线前需法务审核（管辖法律、责任限制等）。
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/marketing/Prose";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using WhatHeThinks.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Prose eyebrow="Terms" title="Terms of Service" updated="2026-09-20">
      <p>
        These terms apply when you use WhatHeThinks. By using the service, you agree to them. If you don't agree,
        please don't use the service.
      </p>

      <h2>What WhatHeThinks is</h2>
      <p>
        WhatHeThinks analyzes observable texting patterns in a chat you provide — such as who starts conversations,
        reply times and how these change over time — and presents them in a report. It describes behavior. It does not
        read minds, predict the future of a relationship, diagnose anyone, or tell you what to do.
      </p>
      <p>
        <strong>WhatHeThinks is not therapy, counseling, or professional advice.</strong> If you are worried about your
        safety or wellbeing, please contact a qualified professional or local emergency services.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>You may only analyze conversations you are a participant in.</li>
        <li>You must have any permission or legal right required in your country to process the conversation.</li>
        <li>
          You may not use the service to monitor, harass, stalk or control another person, or to analyze anyone's
          messages without being part of that conversation.
        </li>
        <li>You are responsible for how you use your report, including anything you choose to share.</li>
        <li>If you create an account, you are responsible for keeping its sign-in details secure.</li>
      </ul>

      <h2>Payments and refunds</h2>
      <p>
        The preview is free. If you choose to unlock the full report, the current price is shown before checkout. It is
        a one-time payment processed by Stripe. There is no subscription.
      </p>
      <p>
        If your report can't be generated after payment, you'll receive an automatic full refund. Once the full report
        has been generated and made available to you, the purchase is final because it is an immediately delivered
        digital product. We don't offer refunds for a change of mind, because you disagree with an interpretation, or
        because the report confirms something you already suspected.
      </p>
      <p>
        Nothing in this policy limits any refund or cancellation rights that apply under the law where you live. If a
        report was not delivered or you believe you were charged in error, contact us at{" "}
        <a href="mailto:support@whathethinks.com">support@whathethinks.com</a>.
      </p>

      <h2>Accuracy and limitations</h2>
      <p>
        Our analysis is based only on the messages in the chat you provide. It can't see calls, in-person conversations,
        other apps or anything happening offline, and automated detection of patterns in language is imperfect. Reports
        separate facts from possible interpretations, and interpretations are exactly that — possibilities, not
        conclusions. The service is provided “as is” without warranties of any kind.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, WhatHeThinks is not liable for any indirect or consequential damages, or
        for decisions you make based on a report. Our total liability for any claim is limited to the amount you paid
        for the report in question.
      </p>

      <h2>Your data</h2>
      <p>
        How we handle your data is described in our <Link href="/privacy">privacy policy</Link>. You can delete reports
        at any time. If you create an account, you can also delete the account and its stored report data from your
        account page.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Questions:{" "}
        <a href="mailto:support@whathethinks.com">support@whathethinks.com</a>.
      </p>
    </Prose>
  );
}
