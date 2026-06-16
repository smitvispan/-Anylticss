// lib/syncAdAccounts.ts
import connectDB from "@/lib/mongodb";
import Account from "@/models/Account";
import AdAccount from "@/models/AdAccount";

type FBAdAccount = {
  id: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  [k: string]: any;
};

async function fetchUserAdAccountsFromFacebook(userAccessToken: string) {
  const collected: FBAdAccount[] = [];
  let url =
    `https://graph.facebook.com/v19.0/me/adaccounts` +
    `?access_token=${encodeURIComponent(userAccessToken)}` +
    `&fields=${encodeURIComponent("id,name,account_status,currency,timezone_name")}`;

  while (url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FB /me/adaccounts failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const data: FBAdAccount[] = json?.data ?? [];
    collected.push(...data);
    url = json?.paging?.next ?? null; // pagination
  }

  return collected;
}

/**
 * Upsert a single AdAccount by adAccountId (no unique on adAccountId required).
 */
async function upsertAdAccountForUser(
  userId: string,
  acc: FBAdAccount,
  tokenSnapshot?: string
) {
  const baseData = {
    userId,
    adAccountId: acc.id,
    name: acc.name ?? null,
    account_status: acc.account_status ?? null,
    currency: acc.currency ?? null,
    timezone_name: acc.timezone_name ?? null,
    accessToken: tokenSnapshot ?? null,
  };

  const existing = await AdAccount.findOne({ adAccountId: acc.id }).select("_id").lean();

  if (existing) {
    return AdAccount.findByIdAndUpdate(existing._id, baseData, { new: true });
  }

  return AdAccount.create(baseData);
}

/**
 * Sync ad accounts for a single user:
 *  - Finds Facebook access token in NextAuth Account (provider='facebook')
 *  - Fetches ad accounts
 *  - Upserts into AdAccount
 * Returns the list of upserted AdAccount IDs.
 */
export async function syncAdAccountsForUser(userId: string) {
  await connectDB();
  const account = await Account.findOne({ userId }).select("accessToken").lean();

  const token = account?.accessToken;
  if (!token) {
    throw new Error(`No Facebook access token for user ${userId}`);
  }

  const fbAdAccounts = await fetchUserAdAccountsFromFacebook(token);
  const saved: string[] = [];

  for (const a of fbAdAccounts) {
    try {
      const rec = await upsertAdAccountForUser(userId, a, token);
      if (rec) saved.push(String((rec as any)._id ?? ""));
    } catch (e) {
      console.error(`Failed to upsert ad account ${a.id} for user ${userId}`, e);
    }
  }

  return saved;
}

/**
 * Sync ad accounts for ALL users that have a facebook Account with accessToken.
 * Returns a map of userId -> count synced.
 */
export async function syncAdAccountsForAllUsers() {
  await connectDB();
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
      const savedIds = await syncAdAccountsForUser(userId);
      result[userId] = savedIds.length;
    } catch (e) {
      console.error(`User ${userId} ad account sync failed`, e);
      result[userId] = 0;
    }
  }

  return result;
}
