import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.hostname !== "www.whathethinks.com") {
    return NextResponse.next();
  }

  const canonicalUrl = request.nextUrl.clone();
  canonicalUrl.hostname = "whathethinks.com";
  canonicalUrl.port = "";
  canonicalUrl.protocol = "https:";
  return NextResponse.redirect(canonicalUrl, 301);
}
