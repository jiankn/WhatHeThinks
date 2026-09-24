"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { alertDialog, confirmDialog } from "@/components/DialogHost";

export function SignOutButton() {
  const [working, setWorking] = useState(false);
  return (
    <button
      type="button"
      className="account-secondary-button"
      disabled={working}
      onClick={async () => {
        setWorking(true);
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/");
      }}
    >
      {working ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function DeleteReportButton({ id }: { id: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  return (
    <button
      type="button"
      className="account-row-delete"
      disabled={working}
      onClick={async () => {
        const ok = await confirmDialog({
          title: "Delete this report?",
          message: "The report and all of its stored example messages will be permanently deleted. This can't be undone.",
          confirmLabel: "Delete report",
          tone: "danger",
        });
        if (!ok) return;
        setWorking(true);
        const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
        if (response.ok) router.refresh();
        else {
          setWorking(false);
          await alertDialog({ title: "Couldn't delete the report", message: "Something went wrong. Please try again." });
        }
      }}
    >
      {working ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DeleteAccountButton() {
  const [working, setWorking] = useState(false);
  return (
    <button
      type="button"
      className="account-danger-button"
      disabled={working}
      onClick={async () => {
        const ok = await confirmDialog({
          title: "Delete your account?",
          message: "Your account, reports, and stored example messages will be permanently deleted. Payment records required for accounting will remain.",
          confirmLabel: "Delete account",
          tone: "danger",
        });
        if (!ok) return;
        setWorking(true);
        const response = await fetch("/api/account", { method: "DELETE" });
        if (response.ok) window.location.assign("/?account=deleted");
        else {
          setWorking(false);
          await alertDialog({ title: "Couldn't delete your account", message: "Something went wrong. Please try again." });
        }
      }}
    >
      {working ? "Deleting account…" : "Delete account and data"}
    </button>
  );
}
