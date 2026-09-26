import openNextWorker from "./.open-next/worker.js";

const CANONICAL_HOST = "whathethinks.com";
const WWW_HOST = "www.whathethinks.com";

function shouldRemoveTrailingSlash(pathname) {
  if (
    pathname.length <= 1 ||
    !pathname.endsWith("/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/")
  ) {
    return false;
  }

  const terminalSegment = pathname.slice(0, -1).split("/").at(-1) ?? "";
  return !terminalSegment.includes(".");
}

function canonicalRedirect(request) {
  const url = new URL(request.url);
  const redirectsFromWww = url.hostname === WWW_HOST;
  const redirectsToHttps = url.protocol !== "https:";
  const removesTrailingSlash = shouldRemoveTrailingSlash(url.pathname);

  if (!redirectsFromWww && !redirectsToHttps && !removesTrailingSlash) {
    return undefined;
  }

  if (redirectsFromWww || redirectsToHttps) {
    url.port = "";
    url.protocol = "https:";
  }

  if (redirectsFromWww) {
    url.hostname = CANONICAL_HOST;
  }

  if (removesTrailingSlash) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return Response.redirect(url, 308);
}

export default {
  async fetch(request, env, ctx) {
    const redirect = canonicalRedirect(request);
    if (redirect) {
      return redirect;
    }

    return openNextWorker.fetch(request, env, ctx);
  },
};
