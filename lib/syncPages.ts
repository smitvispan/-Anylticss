// lib/syncPages.ts
import connectDB from "@/lib/mongodb";
import Account from "@/models/Account";
import Page from "@/models/Page";

type FBPage = {
  id: string;
  name?: string;
  category?: string;
  category_list?: any[];
  access_token?: string;
  tasks?: any[];
  link?: string;
  [k: string]: any;
};

async function fetchUserPagesFromFacebook(userAccessToken: string) {
  const collected: FBPage[] = [];
  let url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(
    userAccessToken
  )}`;

  while (url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FB /me/accounts failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const data: FBPage[] = json?.data ?? [];
    collected.push(...data);
    url = json?.paging?.next ?? null; // pagination
  }

  return collected;
}

/**
 * Upsert a single Page by pageId (no unique on pageId required).
 */
async function upsertPageForUser(userId: string, page: FBPage) {
  const baseData = {
    userId,
    pageId: page.id,
    name: page.name,
    category: page.category,
    category_list: page.category_list as any,
    accessToken: page.access_token,
    link: page.link,
    otherFields: { ...(page as any) },
  };

  const existing = await Page.findOne({ pageId: page.id }).select("_id").lean();

  if (existing?._id) {
    return Page.findByIdAndUpdate(existing._id, baseData, { new: true });
  }

  const created = await Page.create(baseData);
  return created;
}

/**
 * Sync pages for a single user:
 *  - Finds Facebook access token in NextAuth Account
 *  - Fetches pages from FB
 *  - Upserts into Prisma Page
 * Returns the list of upserted Page IDs.
 */
export async function syncPagesForUser(userId: string) {
  await connectDB();

  // Prefer the NextAuth Account token (provider=facebook)
  const account = await Account.findOne({
    userId,
    provider: "facebook",
    accessToken: { $ne: null },
  })
    .select("accessToken")
    .lean();

  // If you ALSO store token directly on User (custom field), you could fallback:
  // const user = await prisma.user.findUnique({ where: { id: userId }, select: { accessToken: true as any } });

  const token = account?.accessToken;
  if (!token) {
    throw new Error(`No Facebook access token for user ${userId}`);
  }

  const fbPages = await fetchUserPagesFromFacebook(token);
  const saved: string[] = [];

  for (const p of fbPages) {
    try {
      const rec = await upsertPageForUser(userId, p);
      if (rec) saved.push(String((rec as any)._id ?? ""));
      // console.log(`Upserted page ${p.name} (${p.id}) for user ${userId}`);
    } catch (e) {
      console.error(`Failed to upsert page ${p.id} for user ${userId}`, e);
    }
  }
  return saved;
}

/**
 * Sync pages for ALL users that have a facebook Account with accessToken.
 * Returns a map of userId -> count synced.
 */
export async function syncPagesForAllUsers() {
  await connectDB();
  // Find distinct userIds that have a facebook account with a token
  const accounts = await Account.find({
    provider: "facebook",
    accessToken: { $ne: null },
  })
    .select("userId")
    .lean();

  const uniqueUserIds = Array.from(new Set(accounts.map((a) => String(a.userId))));
  const result: Record<string, number> = {};

  for (const userId of uniqueUserIds) {
    try {
      const savedIds = await syncPagesForUser(userId);
      result[userId] = savedIds.length;
    } catch (e) {
      console.error(`User ${userId} sync failed`, e);
      result[userId] = 0;
    }
  }

  return result;
}
