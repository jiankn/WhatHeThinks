"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const render = useCallback(() => {
    if (!container.current || !window.turnstile || widgetId.current) return;
    try {
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: "turnstile-spin-v1",
        theme: "light",
        size: "flexible",
        "response-field": true,
      });
    } catch {
      // Widget may already be bound
    }
  }, [siteKey]);

  useEffect(() => {
    if (window.turnstile) {
      render();
    }
    return () => {
      if (widgetId.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          // ignore
        }
        widgetId.current = null;
      }
    };
  }, [render]);

  if (!siteKey) {
    return <p className="auth-security-error">Security verification is not configured.</p>;
  }
  return (
    <div className="auth-turnstile">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={render} />
      <div ref={container} data-action="turnstile-spin-v1" />
      <p>Protected by Cloudflare Turnstile</p>
    </div>
  );
}
