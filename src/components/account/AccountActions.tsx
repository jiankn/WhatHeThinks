"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
        if (!window.confirm("Permanently delete this report and all stored example messages?")) return;
        setWorking(true);
        const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
        if (response.ok) router.refresh();
        else {
          setWorking(false);
          window.alert("The report could not be deleted. Please try again.");
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
        if (!window.confirm("Delete your account, reports, and stored example messages permanently? Payment records required for accounting will remain.")) return;
        setWorking(true);
        const response = await fetch("/api/account", { method: "DELETE" });
        if (response.ok) window.location.assign("/?account=deleted");
        else {
          setWorking(false);
          window.alert("Your account could not be deleted. Please try again.");
        }
      }}
    >
      {working ? "Deleting account…" : "Delete account and data"}
    </button>
  );
}
