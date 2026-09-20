"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/events";
export function VisitTracker() {
  const path = usePathname();
  const last = useRef("");
  useEffect(() => {
    if (last.current === path) return;
    last.current = path;
    if (path.startsWith("/s/")) track("share_landing_view");
    else if (!/^\/(r|analyze|setup|account|login|signup|reset-password|forgot-password|delete)(\/|$)/.test(path)) track("landing_view");
  }, [path]);
  return null;
}
