import { cookies } from "next/headers";
import {
  type AnalyticsSession,
  getAnalyticsSessionFromCookieGetter,
} from "@/lib/analytics-session";

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

export async function getAnalyticsSession(): Promise<AnalyticsSession | null> {
  const cookieStore = await cookies();
  return getAnalyticsSessionFromCookieGetter((cookieName) =>
    getCookieValueWithChunks(cookieStore, cookieName)
  );
}
