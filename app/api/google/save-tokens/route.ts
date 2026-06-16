import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import GoogleUser from "@/models/GoogleUser";
import { authOptions } from "@/lib/auth";
import {
  getSubAccounts,
    getSubAccountsAlternative,
} from "@/services/googleSubAccounts";

async function fetchGoogleProfile(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Google profile (${res.status})`);
  }

  return res.json();
}

async function fetchSearchConsoleSites(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to fetch Search Console sites (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  const entries = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return entries.map((entry: any) => ({
    siteUrl: String(entry.siteUrl),
    permissionLevel: entry.permissionLevel || "unknown",
  }));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  const adminId = session?.user?.id;
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const {
    accessToken,
    refreshToken,
    scope,
    expiresAt,
    googleId: googleIdFromClient,
    email: emailFromClient,
    name: nameFromClient,
    profilePic: profilePicFromClient,
  } = await req.json();

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing access or refresh token" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // 1) Fetch Google profile for this access token
    // Prefer profile info forwarded from the callback to avoid a second Google roundtrip
    const profile =
      googleIdFromClient && emailFromClient
        ? {
            sub: googleIdFromClient,
            email: emailFromClient,
            name: nameFromClient,
            picture: profilePicFromClient,
          }
        : await fetchGoogleProfile(accessToken);

    const googleId = googleIdFromClient || profile.sub || profile.id;
    if (!googleId) {
      throw new Error("Missing google user id from profile");
    }

    const profileEmailRaw = emailFromClient || profile.email;
    const profileEmail = profileEmailRaw || `${googleId}@google-oauth.local`;
    const profileName =
      nameFromClient || profile.name || profileEmail || "Google User";
    const profilePic = profilePicFromClient || profile.picture || "";

    const expiresAtMs =
      expiresAt && !Number.isNaN(Number(expiresAt))
        ? Date.now() + Number(expiresAt) * 1000
        : null;

    // 2) Upsert GoogleUser and attach adminId
    const googleUser = await GoogleUser.findOneAndUpdate(
      { googleId },
      {
        googleId,
        email: profileEmail,
        name: profileName,
        profilePic: profilePic,
        adminId,
        accessToken,
        refreshToken,
        scope,
        expiresAt: expiresAtMs,
        tokenType: "Bearer",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const saveData = {
      adminId,
      googleUserId: googleUser._id,
      accessToken,
      refreshToken,
      scope,
      expiresAt: expiresAtMs,
    };

    // Fetch all accessible Ads accounts for this user (manager + sub-accounts)
    let subAccounts: any[] = [];
    let fetchError: string | null = null;

    try {
      subAccounts = await getSubAccounts(
        accessToken,
        process.env.GOOGLE_MANAGER_ID!
      );
    } catch (err: any) {
      fetchError = err?.message || "Failed to fetch sub-accounts (primary)";
      console.error("[Google Save Tokens] Primary fetch failed:", fetchError);
      try {
        subAccounts = await getSubAccountsAlternative(accessToken);
        fetchError = null; // alternative succeeded
      } catch (errAlt: any) {
        const altMsg =
          errAlt?.message || "Failed to fetch sub-accounts (alternative)";
        fetchError = `${fetchError}; ${altMsg}`;
        console.error("[Google Save Tokens] Alternative fetch failed:", altMsg);
      }
    }

    // If we still have none, fall back to storing just the manager account so tokens persist
    if (!subAccounts.length) {
      const managerId =
        process.env.GOOGLE_MANAGER_ID?.replace(/-/g, "") || "unknown-manager";
      subAccounts = [
        {
          customerId: managerId,
          descriptiveName: "Manager Account",
          manager: true,
          testAccount: false,
        } as any,
      ];
    }

    // Upsert each Ads account with shared tokens
    await Promise.all(
      subAccounts.map((account) =>
        GoogleAdsAccount.findOneAndUpdate(
          { adminId, accountId: account.customerId },
          {
            ...saveData,
            accountId: account.customerId,
            customerId: account.customerId,
            descriptiveName: account.descriptiveName,
            manager: account.manager,
            timeZone: account.timeZone,
            userEmail: profileEmail,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    // 4) Fetch Search Console sites and upsert
    let scSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    let scWarning: string | null = null;

    try {
      scSites = await fetchSearchConsoleSites(accessToken);
    } catch (err: any) {
      scWarning =
        err?.message ||
        "Failed to fetch Search Console sites (missing access or scope)";
      console.error("[Google Save Tokens] Search Console fetch failed:", scWarning);
    }

    if (scSites.length) {
      await Promise.all(
        scSites.map((site) =>
          GoogleSearchConsoleAccount.findOneAndUpdate(
            { adminId, siteUrl: site.siteUrl },
            {
              ...saveData,
              siteUrl: site.siteUrl,
              permissionLevel: site.permissionLevel,
              userEmail: profileEmail,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        )
      );
    }

    return NextResponse.json({
      success: true,
      adsAccountsSynced: subAccounts.length,
      searchConsoleSitesSynced: scSites.length,
      warning: [fetchError, scWarning].filter(Boolean).join("; ") || undefined,
    });
  } catch (error: any) {
    console.error("[Google Save Tokens] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save tokens" },
      { status: 500 }
    );
  }
}
