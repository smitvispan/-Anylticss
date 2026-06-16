import connectDB from "@/lib/mongodb";
import GoogleAdsAccount, { IGoogleAdsAccount } from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount, { IGoogleSearchConsoleAccount } from "@/models/GoogleSearchConsoleAccount";
import GoogleUser from "@/models/GoogleUser";

type RefreshSource = {
  clientId?: string | null;
  clientSecret?: string | null;
};

// Prefer app-level GOOGLE_CLIENT_ID/SECRET; fallback to Ads-specific names if present.
const DEFAULT_CLIENT_IDS = ["GOOGLE_CLIENT_ID", "GOOGLE_ADS_CLIENT_ID"];
const DEFAULT_CLIENT_SECRETS = ["GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_CLIENT_SECRET"];

function pickEnv(keys: string[]) {
  for (const k of keys) {
    const val = process.env[k];
    if (val) return val;
  }
  return "";
}

function normalizeExpiresAt(expiresAt?: number | null) {
  if (!expiresAt || Number.isNaN(Number(expiresAt))) return null;
  const numeric = Number(expiresAt);
  return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
}

function tokenIsValid(expiresAt?: number | null) {
  const normalized = normalizeExpiresAt(expiresAt);
  if (!normalized) return false;
  const now = Date.now() / 1000;
  return normalized > now + 60; // 1 minute buffer
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  opts?: RefreshSource
): Promise<{ accessToken: string; expiresAt?: number }> {
  if (!refreshToken) throw new Error("Missing refresh token for Google OAuth");

  const clientId = opts?.clientId ?? pickEnv(DEFAULT_CLIENT_IDS);
  const clientSecret = opts?.clientSecret ?? pickEnv(DEFAULT_CLIENT_SECRETS);

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google client credentials (client_id / client_secret)");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to refresh Google token (${res.status}): ${text}`);
  }

  const json = JSON.parse(text);
  const accessToken = json.access_token as string;
  const expiresAt = json.expires_in ? Math.floor(Date.now() / 1000 + Number(json.expires_in)) : undefined;

  if (!accessToken) {
    throw new Error("Google token refresh did not return access_token");
  }

  return { accessToken, expiresAt };
}

type MinimalAccount = Pick<
  IGoogleAdsAccount,
  "_id" | "accessToken" | "refreshToken" | "expiresAt"
> &
  Partial<IGoogleAdsAccount>;

type MinimalGoogleUser = {
  _id: unknown;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
};

async function loadLinkedGoogleUser(googleUserId?: unknown): Promise<MinimalGoogleUser | null> {
  if (!googleUserId) return null;
  return GoogleUser.findById(googleUserId)
    .select({ _id: 1, accessToken: 1, refreshToken: 1, expiresAt: 1 })
    .lean<MinimalGoogleUser | null>();
}

function canUseEnvRefreshFallback(account: { adminId?: unknown; googleUserId?: unknown }) {
  return Boolean(account.adminId || account.googleUserId);
}

/**
 * Ensures a valid Google Ads access token for a given account document or id.
 * If the token is missing/expired, it will be refreshed and persisted.
 */
export async function ensureGoogleAdsAccessToken(
  accountOrId: MinimalAccount | string,
  opts?: { forceRefresh?: boolean }
): Promise<string> {
  await connectDB();

  const account: MinimalAccount | null =
    typeof accountOrId === "string"
      ? ((await GoogleAdsAccount.findById(accountOrId).lean()) as MinimalAccount | null)
      : accountOrId;

  if (!account?._id) {
    throw new Error("Google Ads account not found");
  }

  const linkedGoogleUser = await loadLinkedGoogleUser(account.googleUserId);

  if (!opts?.forceRefresh && account.accessToken && tokenIsValid(account.expiresAt)) {
    return account.accessToken;
  }

  if (
    !opts?.forceRefresh &&
    linkedGoogleUser?.accessToken &&
    tokenIsValid(linkedGoogleUser.expiresAt)
  ) {
    return linkedGoogleUser.accessToken;
  }

  const refreshToken =
    account.refreshToken ||
    linkedGoogleUser?.refreshToken ||
    (canUseEnvRefreshFallback(account)
      ? process.env.GOOGLE_ADS_REFRESH_TOKEN || process.env.REFRESH_TOKEN
      : "");

  if (!refreshToken) {
    throw new Error("Google Ads account is not connected. Missing refresh token.");
  }

  const { accessToken, expiresAt } = await refreshGoogleAccessToken(refreshToken || "", {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  });

  const normalizedExpiresAt = normalizeExpiresAt(expiresAt);

  await GoogleAdsAccount.updateOne(
    { _id: account._id },
    { $set: { accessToken, expiresAt: normalizedExpiresAt, refreshToken } }
  );

  if (linkedGoogleUser?._id) {
    await GoogleUser.updateOne(
      { _id: linkedGoogleUser._id },
      { $set: { accessToken, expiresAt: normalizedExpiresAt, refreshToken } }
    );
  }

  return accessToken;
}

/**
 * Generic helper to apply Google OAuth bearer headers.
 */
export function buildGoogleAuthHeaders(accessToken: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  };
}

type MinimalGscAccount = Pick<
  IGoogleSearchConsoleAccount,
  "_id" | "accessToken" | "refreshToken" | "expiresAt"
> &
  Partial<IGoogleSearchConsoleAccount>;

/**
 * Ensure a valid Search Console access token for a GSC account.
 */
export async function ensureSearchConsoleAccessToken(
  accountOrId: MinimalGscAccount | string,
  opts?: { forceRefresh?: boolean }
): Promise<string> {
  await connectDB();

  const account: MinimalGscAccount | null =
    typeof accountOrId === "string"
      ? ((await GoogleSearchConsoleAccount.findById(accountOrId).lean()) as MinimalGscAccount | null)
      : accountOrId;

  if (!account?._id) {
    throw new Error("Search Console account not found");
  }

  const linkedGoogleUser = await loadLinkedGoogleUser(account.googleUserId);

  if (!opts?.forceRefresh && account.accessToken && tokenIsValid(account.expiresAt)) {
    return account.accessToken;
  }

  if (
    !opts?.forceRefresh &&
    linkedGoogleUser?.accessToken &&
    tokenIsValid(linkedGoogleUser.expiresAt)
  ) {
    return linkedGoogleUser.accessToken;
  }

  const refreshToken =
    account.refreshToken ||
    linkedGoogleUser?.refreshToken ||
    (canUseEnvRefreshFallback(account)
      ? process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN || process.env.REFRESH_TOKEN
      : "");

  if (!refreshToken) {
    throw new Error("Search Console account is not connected. Missing refresh token.");
  }

  const { accessToken, expiresAt } = await refreshGoogleAccessToken(refreshToken || "", {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET
  });

  const normalizedExpiresAt = normalizeExpiresAt(expiresAt);

  await GoogleSearchConsoleAccount.updateOne(
    { _id: account._id },
    { $set: { accessToken, expiresAt: normalizedExpiresAt, refreshToken } }
  );

  if (linkedGoogleUser?._id) {
    await GoogleUser.updateOne(
      { _id: linkedGoogleUser._id },
      { $set: { accessToken, expiresAt: normalizedExpiresAt, refreshToken } }
    );
  }

  return accessToken;
}
