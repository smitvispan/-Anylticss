import { cookies } from "next/headers";
import {
  decodeClientSessionToken,
  getClientSessionCookieNames,
  type ClientSessionUser,
  normalizeClientSessionUser,
} from "@/lib/client-auth";

export type ClientSession = {
  user: ClientSessionUser;
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function getCookieValueWithChunks(cookieStore: CookieStore, cookieName: string) {
  const direct = cookieStore.get(cookieName)?.value;
  if (direct) return direct;

  const chunks = cookieStore
    .getAll()
    .filter((cookie) => cookie.name.startsWith(`${cookieName}.`))
    .map((cookie) => {
      const suffix = Number(cookie.name.slice(cookieName.length + 1));
      return { value: cookie.value, index: Number.isFinite(suffix) ? suffix : Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) => a.index - b.index);

  if (!chunks.length) return undefined;
  return chunks.map((chunk) => chunk.value).join("");
}

export async function getClientSession(role?: string): Promise<ClientSession | null> {
  const cookieStore = await cookies();

  // If role is provided, only check cookies for that specific role
  for (const cookieName of getClientSessionCookieNames(role)) {
    const token = getCookieValueWithChunks(cookieStore, cookieName);
    if (!token) continue;

    try {
      const payload = await decodeClientSessionToken(token);
      const user = normalizeClientSessionUser(payload as Record<string, unknown> | null | undefined);

      // Verification: if role was requested, ensure it matches (extra safety)
      if (user && (!role || user.role === role)) {
        return { user };
      }
    } catch {
      continue;
    }
  }

  return null;
}
