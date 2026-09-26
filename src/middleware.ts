import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Use the platform URL instead of NextURL: NextURL retains the original
  // trailing-slash formatting flag after pathname is changed.
  const canonicalUrl = new URL(request.url);
  const pathname = canonicalUrl.pathname;
  const redirectsFromWww = canonicalUrl.hostname === "www.whathethinks.com";
  const removesTrailingSlash =
    pathname.length > 1 &&
    pathname.endsWith("/") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/.well-known/") &&
    !/\.[^/]+$/.test(pathname.slice(0, -1));

  if (!redirectsFromWww && !removesTrailingSlash) {
    return NextResponse.next();
  }

  if (redirectsFromWww) {
    canonicalUrl.hostname = "whathethinks.com";
    canonicalUrl.port = "";
    canonicalUrl.protocol = "https:";
  }

  if (removesTrailingSlash) {
    canonicalUrl.pathname = pathname.slice(0, -1);
  }

  // 308 keeps the request method and NextUrl preserves the complete query string.
  return NextResponse.redirect(canonicalUrl, 308);
}
