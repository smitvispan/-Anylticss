import connectDB from "@/lib/mongodb";
import Account from "@/models/Account";
import User from "@/models/User";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";

type IGAccount = {
  id: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  name?: string;
  [k: string]: any;
};

async function fetchInstagramAccounts(userAccessToken: string) {
  const collected: IGAccount[] = [];
  let url = `https://graph.facebook.com/v19.0/me/instagram_accounts?fields=id,username,profile_picture_url,followers_count,follows_count,media_count,name&access_token=${encodeURIComponent(
    userAccessToken
  )}`;
  console.log("Fetching Instagram accounts from:", url);

  while (url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FB /me/instagram_accounts failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const data: IGAccount[] = json?.data ?? [];
    collected.push(...data);
    url = json?.paging?.next ?? null; // handle pagination
  }

  return collected;
}

async function upsertInstagramAccountForUser(
  userId: string,
  ig: IGAccount,
  pageAccessToken: string
) {
  const baseData = {
    userId,
    igId: ig.id,
    name: ig.name,
    username: ig.username,
    profile_picture_url: ig.profile_picture_url,
    followers_count: ig.followers_count,
    follows_count: ig.follows_count,
    media_count: ig.media_count,
    pageAccessToken,
  };

  const existing = await InstagramAccount.findOne({ igId: ig.id }).select("_id").lean();

  if (existing) {
    return InstagramAccount.findByIdAndUpdate(existing._id, baseData, { new: true });
  }

  return InstagramAccount.create(baseData);
}

/**
 * Sync Instagram accounts for a single user.
 */
export async function syncInstagramForUser(userId: string) {
  await connectDB();

  // get fb account with accessToken
  const user_db = await User.findById(userId).select({ _id: 1, mainPage: 1 }).lean();
  if (!user_db) {
    throw new Error(`User not found: ${userId}`);
  }
  if (!user_db.mainPage) {
    // mainPage is null/undefined – fail fast with a clear message
    throw new Error(`No main Page configured for user ${userId}`);
  }
  const page = await Page.findById(user_db.mainPage).select({ accessToken: 1 }).lean();
  const token = page?.accessToken;
  if (!token) {
    throw new Error(`No Facebook access token for user ${userId}`);
  }

  // fetch ig accounts
  const igAccounts = await fetchInstagramAccounts(token);
  const saved: string[] = [];

  for (const ig of igAccounts) {
    try {
      const rec = await upsertInstagramAccountForUser(
        userId,
        ig,
        token // the same token works for IG via connected page
      );
      saved.push(rec.id);
    } catch (e) {
      console.error(`Failed to upsert IG ${ig.id} for user ${userId}`, e);
    }
  }

  return saved;
}

/**
 * Sync Instagram accounts for all users with a fb account/token.
 */
export async function syncInstagramForAllUsers() {
  await connectDB();
  const fbAccounts = await Account.find({
    provider: "facebook",
    accessToken: { $ne: null },
  })
    .select("userId")
    .lean();

  const uniqueUserIds = Array.from(new Set(fbAccounts.map((a) => String(a.userId))));
  const result: Record<string, number> = {};

  for (const userId of uniqueUserIds) {
    try {
      const savedIds = await syncInstagramForUser(userId);
      result[userId] = savedIds.length;
    } catch (e) {
      console.error(`User ${userId} IG sync failed`, e);
      result[userId] = 0;
    }
  }

  return result;
}
