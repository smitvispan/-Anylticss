import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import GoogleUser from "@/models/GoogleUser";
import User from "@/models/User";
import {
  getSubAccounts,
  getSubAccountsAlternative,
} from "@/services/googleSubAccounts";
import { isUnlimitedPlanLimit } from "@/lib/plan-limits";
import {
  ConnectionOAuthError,
  resolveConnectionContext,
} from "@/lib/connection-oauth";

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
  const {
    accessToken,
    refreshToken,
    scope,
    expiresAt,
    googleId: googleIdFromClient,
    email: emailFromClient,
    name: nameFromClient,
    profilePic: profilePicFromClient,
    ownerId: ownerIdFromClient,
  } = await req.json();

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing access or refresh token" },
      { status: 400 }
    );
  }

  try {
    const context = await resolveConnectionContext({
      requestedOwnerId: ownerIdFromClient,
    });
    const ownerId = context.ownerId;

    await connectDB();
    const ownerUser = await User.findById(ownerId)
      .select({ _id: 1, email: 1, activeSubscription: 1 })
      .populate({
        path: "activeSubscription",
        populate: {
          path: "planId",
          select: { maxGoogleAdsAccounts: 1, maxSeoReports: 1 },
        },
      })
      .lean();

    if (!ownerUser) {
      throw new Error("Owner workspace not found.");
    }

    const ownerSubscription = (ownerUser as any)?.activeSubscription;
    const ownerPlan =
      ownerSubscription?.status === "active" && ownerSubscription?.endDate
        ? new Date(ownerSubscription.endDate).getTime() > Date.now()
          ? ownerSubscription.planId
          : null
        : null;

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

    const expiresAtSeconds =
      expiresAt && !Number.isNaN(Number(expiresAt))
        ? Math.floor(Date.now() / 1000) + Number(expiresAt)
        : null;

    // 2) Upsert GoogleUser and attach adminId
    const googleUser = await GoogleUser.findOneAndUpdate(
      { googleId },
      {
        googleId,
        email: profileEmail,
        name: profileName,
        profilePic: profilePic,
        adminId: ownerId,
        accessToken,
        refreshToken,
        scope,
        expiresAt: expiresAtSeconds,
        tokenType: "Bearer",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const saveData = {
      adminId: ownerId,
      googleUserId: googleUser._id,
      accessToken,
      refreshToken,
      scope,
      expiresAt: expiresAtSeconds,
    };

    const ownerScopedEmail =
      typeof ownerUser?.email === "string" && ownerUser.email.trim()
        ? ownerUser.email.trim().toLowerCase()
        : profileEmail;
    const applyCap = <T,>(items: T[], rawLimit: unknown) => {
      if (rawLimit === null || rawLimit === undefined || isUnlimitedPlanLimit(rawLimit)) {
        return { visible: items, truncated: 0 };
      }

      const limit = Math.max(0, Number(rawLimit || 0));
      const visible = items.slice(0, limit);
      return {
        visible,
        truncated: Math.max(items.length - visible.length, 0),
      };
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

    const cappedAds = applyCap(subAccounts, ownerPlan?.maxGoogleAdsAccounts);

    // Upsert each Ads account with shared tokens
    await Promise.all(
      cappedAds.visible.map((account) =>
        GoogleAdsAccount.findOneAndUpdate(
          { adminId: ownerId, accountId: account.customerId },
          {
            ...saveData,
            accountId: account.customerId,
            customerId: account.customerId,
            descriptiveName: account.descriptiveName,
            manager: account.manager,
            timeZone: account.timeZone,
            userEmail: ownerScopedEmail,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    if (ownerPlan && !isUnlimitedPlanLimit(ownerPlan.maxGoogleAdsAccounts)) {
      const allowedAccountIds = cappedAds.visible.map((account) => account.customerId);
      await GoogleAdsAccount.deleteMany({
        adminId: ownerId,
        userEmail: ownerScopedEmail,
        accountId: { $nin: allowedAccountIds.length ? allowedAccountIds : ["__none__"] },
      });
    }

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

    const cappedSites = applyCap(scSites, ownerPlan?.maxSeoReports);

    if (cappedSites.visible.length) {
      await Promise.all(
        cappedSites.visible.map((site) =>
          GoogleSearchConsoleAccount.findOneAndUpdate(
            { adminId: ownerId, siteUrl: site.siteUrl },
            {
              ...saveData,
              siteUrl: site.siteUrl,
              permissionLevel: site.permissionLevel,
              userEmail: ownerScopedEmail,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        )
      );
    }

    if (ownerPlan && !isUnlimitedPlanLimit(ownerPlan.maxSeoReports)) {
      const allowedSiteUrls = cappedSites.visible.map((site) => site.siteUrl);
      await GoogleSearchConsoleAccount.deleteMany({
        adminId: ownerId,
        userEmail: ownerScopedEmail,
        siteUrl: { $nin: allowedSiteUrls.length ? allowedSiteUrls : ["__none__"] },
      });
    }

    const warnings = [fetchError, scWarning].filter(Boolean);
    if (cappedAds.truncated > 0) {
      warnings.push(`Google Ads plan limit applied. ${cappedAds.truncated} account(s) were not saved.`);
    }
    if (cappedSites.truncated > 0) {
      warnings.push(`Website plan limit applied. ${cappedSites.truncated} Search Console propert${cappedSites.truncated === 1 ? "y was" : "ies were"} not saved.`);
    }

    return NextResponse.json({
      success: true,
      adsAccountsSynced: cappedAds.visible.length,
      searchConsoleSitesSynced: cappedSites.visible.length,
      warning: warnings.join("; ") || undefined,
    });
  } catch (error: any) {
    if (error instanceof ConnectionOAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Google Save Tokens] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save tokens" },
      { status: 500 }
    );
  }
}
