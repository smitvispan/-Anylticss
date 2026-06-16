import { decode, encode } from "next-auth/jwt";

export const CLIENT_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export type ClientSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "client" | "user";
  canResell?: boolean;
  planName?: string;
};

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for client sessions.");
  }
  return secret;
}

function shouldUseSecureClientSessionCookies() {
  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    try {
      const { protocol, hostname } = new URL(appUrl);
      const isLoopback =
        hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

      if (!isLoopback) {
        return protocol === "https:";
      }
    } catch {
      // Fall through to the environment default below.
    }
  }

  return process.env.NODE_ENV === "production";
}

export function getClientSessionCookieNames(role?: string) {
  const baseNames = [];
  if (!role || role === "client") {
    baseNames.push("client.session-token");
  }
  if (!role || role === "user") {
    baseNames.push("user.session-token");
  }

  const allNames: string[] = [];
  const preferSecure = shouldUseSecureClientSessionCookies();
  for (const base of baseNames) {
    if (preferSecure) {
      allNames.push(`__Secure-${base}`, base);
    } else {
      allNames.push(base, `__Secure-${base}`);
    }
  }
  return allNames;
}

export function getPreferredClientSessionCookieName(role?: string) {
  const base = role === "user" ? "user.session-token" : "client.session-token";
  return shouldUseSecureClientSessionCookies() ? `__Secure-${base}` : base;
}

export function getClientSessionCookieOptions(persistent: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureClientSessionCookies(),
    path: "/",
    ...(persistent ? { maxAge: CLIENT_SESSION_MAX_AGE } : {}),
  };
}

export async function encodeClientSessionToken(user: ClientSessionUser) {
  return encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      picture: user.image ?? undefined,
      role: user.role,
      canResell: user.canResell,
      planName: user.planName,
    },
    secret: getJwtSecret(),
    maxAge: CLIENT_SESSION_MAX_AGE,
  });
}

export async function decodeClientSessionToken(token: string) {
  if (!token) return null;
  return decode({
    token,
    secret: getJwtSecret(),
  });
}

export function normalizeClientSessionUser(token: Record<string, unknown> | null | undefined): ClientSessionUser | null {
  const id = typeof token?.id === "string" ? token.id : typeof token?.sub === "string" ? token.sub : null;
  const role = typeof token?.role === "string" ? token.role : null;

  if (!id || (role !== "client" && role !== "user")) {
    return null;
  }

  return {
    id,
    name: typeof token?.name === "string" ? token.name : null,
    email: typeof token?.email === "string" ? token.email : null,
    image: typeof token?.picture === "string" ? token.picture : null,
    role: role as "client" | "user",
    canResell: typeof token?.canResell === "boolean" ? token.canResell : undefined,
    planName: typeof token?.planName === "string" ? token.planName : undefined,
  };
}
