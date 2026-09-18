import type { Metadata } from "next";
import { DeleteForm } from "./DeleteForm";

export const metadata: Metadata = {
  title: "Delete my data",
  description: "Permanently delete a WhatHeThinks report and the example messages stored with it.",
  robots: { index: false, follow: true },
};

export default function DeletePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-10 pb-10">
      <p className="eyebrow">Your data, your call</p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Delete a report</h1>
      <p className="mt-3 text-muted">
        Your full chat never reaches our servers. What we store for a report is its statistics and up to 120 anonymized
        example messages (deleted automatically after 30 days). Deleting a report removes all of it, permanently.
      </p>
      <DeleteForm />
      <p className="mt-6 text-sm text-muted">
        You can also delete a report from the bottom of the report page itself. Payment records (amount and date) are
        kept for accounting, with no chat content.
      </p>
    </main>
  );
}
