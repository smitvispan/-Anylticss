import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/env";

const ERP_LOGIN_URL =
  process.env.ERP_LOGIN_URL || "https://erp.vispansolutions.com/authentication/login";
const ONE_MONTH_SECONDS = 30 * 24 * 60 * 60;

type CallbackPayload = {
  userId: string | null;
  erpToken: string | null;
  redirectUrl: string | null;
  locale: string | null;
};

function parseSearchParams(url: URL): CallbackPayload {
  const params = url.searchParams;
  return {
    userId: params.get("_id") || params.get("id"),
    erpToken: params.get("ERP_token") || params.get("erp_token") || params.get("token"),
    redirectUrl: params.get("url"),
    locale: params.get("locale"),
  };
}

async function parseRequest(req: Request): Promise<CallbackPayload> {
  const url = new URL(req.url);
  let payload = parseSearchParams(url);

  if ((!payload.userId || !payload.erpToken) && req.method === "POST") {
    try {
      const body = await req.json();
      payload = {
        userId: (body?._id || body?.id || "").trim?.() || payload.userId,
        erpToken: (body?.ERP_token || body?.erp_token || body?.token || "").trim?.() || payload.erpToken,
        redirectUrl: (body?.url || "").trim?.() || payload.redirectUrl,
        locale: (body?.locale || "").trim?.() || payload.locale,
      };
    } catch {
      // Ignore body parsing errors; fall back to query params
    }
  }

  return payload;
}

function resolveRedirect(target: string | null, requestUrl: URL) {
  const baseUrl = getAppBaseUrl(requestUrl.origin);
  if (!target) return `${baseUrl}/`;
  try {
    return new URL(target, baseUrl).toString();
  } catch {
    return `${baseUrl}/`;
  }
}

function buildAnalyticsPath(locale: string, userId: string) {
  const safeLocale = locale || "en";
  return `/${safeLocale}/analytics/${userId}`;
}

function sanitizeLocale(locale: string | null | undefined) {
  if (!locale) return "en";
  const match = String(locale).match(/^[A-Za-z-]{2,10}$/);
  return match ? match[0] : "en";
}

function buildLoginRedirect() {
  return NextResponse.redirect(ERP_LOGIN_URL, { status: 302 });
}

async function handleRequest(req: Request) {
  const payload = await parseRequest(req);
  const requestUrl = new URL(req.url);
  const isHttps =
    requestUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

  if (!payload.userId || !payload.erpToken) {
    return buildLoginRedirect();
  }

  const secret = authOptions.secret || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "NEXTAUTH_SECRET is not configured" },
      { status: 500 }
    );
  }

  await connectDB();
  const user = await User.findById(payload.userId)
    .select({ _id: 1, email: 1, name: 1, ERP_token: 1, isAdmin: 1 })
    .lean();

  if (!user || !user.ERP_token || user.ERP_token !== payload.erpToken) {
    return buildLoginRedirect();
  }

  const locale = sanitizeLocale(payload.locale);
  // Always land analytics users (including admins) on their analytics page
  const targetPath = buildAnalyticsPath(locale, String(user._id));
  const sessionToken = await encode({
    token: {
      id: String(user._id),
      email: user.email || undefined,
      name: user.name || undefined,
      role: user.isAdmin ? "admin" : "client",
      provider: "erp-callback",
    },
    secret,
    maxAge: ONE_MONTH_SECONDS,
  });

  const redirectUrl = resolveRedirect(targetPath, requestUrl);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  const cookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_MONTH_SECONDS,
  };

  const cookieNames = isHttps
    ? ["__Secure-next-auth.session-token", "next-auth.session-token"]
    : ["next-auth.session-token"];

  cookieNames.forEach((name) => response.cookies.set(name, sessionToken, cookieOptions));

  // Non-HTTP-only marker for UI/debugging; still scoped to one month
  response.cookies.set("analytics_user_id", String(user._id), {
    httpOnly: false,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_MONTH_SECONDS,
  });

  return response;
}

export async function GET(req: Request) {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}
