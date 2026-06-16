import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { locales } from "@/config";
import { getAnalyticsSessionFromCookieGetter } from "@/lib/analytics-session";

function parseAnalyticsUserId(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const locale = segments[0];
  const offset = locales.includes(locale) ? 1 : 0;

  if (segments[offset] !== "analytics") return null;
  return segments[offset + 1] || null;
}

const PUBLIC_DEMO_IDS = ["69e9d4be0e01722e545108ca"];

function parseLocale(pathname: string) {
  const [maybeLocale] = pathname.split("/").filter(Boolean);
  return maybeLocale && locales.includes(maybeLocale) ? maybeLocale : "en";
}

function buildLoginRedirect(request: NextRequest, callbackUrl?: string | null) {
  const locale = parseLocale(request.nextUrl.pathname);
  const loginUrl = new URL(`/${locale}/login`, request.url);

  if (callbackUrl?.startsWith("/")) {
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
  }

  return NextResponse.redirect(loginUrl, { status: 302 });
}

export default async function middleware(request: NextRequest) {
  // Read locale header for default
  const defaultLocale = request.headers.get("dashcode-locale") || "en";
  const path = request.nextUrl.pathname;
  const segments = path.split("/").filter(Boolean);
  const hasLocalePrefix = Boolean(segments[0] && locales.includes(segments[0]));
  const localeFromPath = hasLocalePrefix ? segments[0] : defaultLocale;
  const pathWithoutLocale = `/${segments.slice(hasLocalePrefix ? 1 : 0).join("/")}`;

  if (pathWithoutLocale === "/demo/client" || pathWithoutLocale === "/demo/client/login") {
    const demoLoginUrl = new URL(`/${localeFromPath}/demo/login`, request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      demoLoginUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(demoLoginUrl, { status: 302 });
  }

  // Root path redirection
  if (path === "/" || path === "/en" || path === "/ar" || path === "/en/" || path === "/ar/") {
    const analyticsSession = await getAnalyticsSessionFromCookieGetter(
      (cookieName) => request.cookies.get(cookieName)?.value
    );
    const resolvedLocale = parseLocale(path) || defaultLocale;

    if (analyticsSession?.user?.id) {
      if (analyticsSession.user.role === "admin") {
        return NextResponse.redirect(new URL(`/${resolvedLocale}/admin`, request.url));
      } else {
        return NextResponse.redirect(new URL(`/${resolvedLocale}/analytics/${analyticsSession.user.id}`, request.url));
      }
    }
  }

  // Protect public analytics pages: require session with matching user id
  const requestedUserId = parseAnalyticsUserId(request.nextUrl.pathname);
  if (requestedUserId) {
    const analyticsSession = await getAnalyticsSessionFromCookieGetter(
      (cookieName) => request.cookies.get(cookieName)?.value
    );

    if (!analyticsSession?.user?.id) {
      // Allow public access to Demo IDs
      if (PUBLIC_DEMO_IDS.includes(requestedUserId)) {
        return; // Proceed to i18n routing
      }
      const targetPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      return buildLoginRedirect(request, targetPath);
    }

    if (
      analyticsSession.user.role === "user" &&
      analyticsSession.user.id !== requestedUserId
    ) {
      const targetPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      return buildLoginRedirect(request, targetPath);
    }
  }

  // Apply i18n routing
  const handleI18nRouting = createMiddleware({
    locales,
    defaultLocale,
  });
  const response = handleI18nRouting(request);

  // Echo locale header
  response.headers.set("dashcode-locale", defaultLocale);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .*\\..* (files with extension like .png, .css, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/",
  ],
};
