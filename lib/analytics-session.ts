import { decode } from "next-auth/jwt";
import {
  decodeClientSessionToken,
  getClientSessionCookieNames,
  normalizeClientSessionUser,
} from "@/lib/client-auth";

export type AnalyticsSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "client" | "admin" | "user";
};

export type AnalyticsSession = {
  user: AnalyticsSessionUser;
};

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for analytics sessions.");
  }
  return secret;
}

function getNextAuthSessionCookieNames() {
  return process.env.NODE_ENV === "production"
    ? ["__Secure-next-auth.session-token", "next-auth.session-token"]
    : ["next-auth.session-token", "__Secure-next-auth.session-token"];
}

export function getAnalyticsSessionCookieNames() {
  return [...getClientSessionCookieNames(), ...getNextAuthSessionCookieNames()];
}

function normalizeNextAuthSessionUser(
  token: Record<string, unknown> | null | undefined
): AnalyticsSessionUser | null {
  const id =
    typeof token?.id === "string"
      ? token.id
      : typeof token?.sub === "string"
        ? token.sub
        : null;
  const rawRole = typeof token?.role === "string" ? token.role : null;
  const role =
    rawRole === "admin" || rawRole === "superadmin"
      ? "admin"
      : rawRole === "client"
        ? "client"
        : rawRole === "user"
          ? "user"
          : null;

  if (!id || !role) {
    return null;
  }

  return {
    id,
    name: typeof token?.name === "string" ? token.name : null,
    email: typeof token?.email === "string" ? token.email : null,
    image: typeof token?.picture === "string" ? token.picture : null,
    role,
  };
}

export async function resolveAnalyticsSessionUser(
  cookieName: string,
  token: string
): Promise<AnalyticsSessionUser | null> {
  if (!token) return null;

  try {
    if (cookieName.includes("client.session-token") || cookieName.includes("user.session-token")) {
      const payload = await decodeClientSessionToken(token);
      const clientUser = normalizeClientSessionUser(
        payload as Record<string, unknown> | null | undefined
      );

      if (!clientUser) {
        return null;
      }

      return {
        ...clientUser,
      };
    }

    const payload = await decode({
      token,
      secret: getJwtSecret(),
    });

    return normalizeNextAuthSessionUser(payload as Record<string, unknown> | null | undefined);
  } catch {
    return null;
  }
}

export async function getAnalyticsSessionFromCookieGetter(
  getCookieValue: (cookieName: string) => string | undefined
): Promise<AnalyticsSession | null> {
  for (const cookieName of getAnalyticsSessionCookieNames()) {
    const token = getCookieValue(cookieName);
    if (!token) continue;

    const user = await resolveAnalyticsSessionUser(cookieName, token);
    if (user) {
      return { user };
    }
  }

  return null;
}
