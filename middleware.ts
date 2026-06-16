import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken, decode } from "next-auth/jwt";
import { locales } from "@/config";

const ERP_LOGIN_URL =
  process.env.ERP_LOGIN_URL || "https://erp.vispansolutions.com/authentication/login";
const jwtSecret = process.env.NEXTAUTH_SECRET;

function parseAnalyticsUserId(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const locale = segments[0];
  const offset = locales.includes(locale) ? 1 : 0;

  if (segments[offset] !== "analytics") return null;
  return segments[offset + 1] || null;
}

export default async function middleware(request: NextRequest) {
  // Read locale header for default
  const defaultLocale = request.headers.get("dashcode-locale") || "en";

  // Protect public analytics pages: require session with matching user id
  const requestedUserId = parseAnalyticsUserId(request.nextUrl.pathname);
  if (requestedUserId) {
    if (!jwtSecret) {
      console.error("[middleware] deny redirect: missing NEXTAUTH_SECRET", {
        path: request.nextUrl.pathname,
      });
      return NextResponse.redirect(ERP_LOGIN_URL, { status: 302 });
    }

    let token = await getToken({
      req: request as any,
      secret: jwtSecret,
    });

    if (!token?.id) {
      // Fallback: manually decode cookie
      const raw =
        request.cookies.get("__Secure-next-auth.session-token")?.value ||
        request.cookies.get("next-auth.session-token")?.value ||
        "";
      if (raw) {
        try {
          token = await decode({ token: raw, secret: jwtSecret });
          console.info("[middleware] fallback decode succeeded", {
            path: request.nextUrl.pathname,
            requestedUserId,
            tokenId: (token as any)?.id || (token as any)?.sub || null,
          });
        } catch (err) {
          console.warn("[middleware] fallback decode failed", {
            path: request.nextUrl.pathname,
            requestedUserId,
            error: (err as any)?.message,
          });
        }
      } else {
        console.warn("[middleware] deny redirect: no session token found", {
          path: request.nextUrl.pathname,
          requestedUserId,
        });
        return NextResponse.redirect(ERP_LOGIN_URL, { status: 302 });
      }
    }

    const tokenUserId = (token as any)?.id || (token as any)?.sub || null;
    if (!tokenUserId) {
      console.warn("[middleware] deny redirect: token missing user id after decode", {
        path: request.nextUrl.pathname,
        requestedUserId,
      });
      return NextResponse.redirect(ERP_LOGIN_URL, { status: 302 });
    }

    if (tokenUserId !== requestedUserId) {
      console.warn("[middleware] deny redirect: token user mismatch", {
        path: request.nextUrl.pathname,
        tokenUserId,
        requestedUserId,
      });
      return NextResponse.redirect(ERP_LOGIN_URL, { status: 302 });
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
  matcher: ["/(ar|en)/analytics/:path*"],
};
