import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FacebookUser from "@/models/FacebookUser";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import { getAppBaseUrl } from "@/lib/env";
import { checkSubscriptionLimit } from "@/lib/subscription-utils";
import {
  buildAnalyticsConnectionsPath,
  ConnectionOAuthError,
  decodeConnectionOAuthState,
  resolveConnectionContext,
} from "@/lib/connection-oauth";

async function exchangeCodeForToken(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

async function extendToken(shortToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
    fb_exchange_token: shortToken,
  });

  const res = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

async function fetchProfile(accessToken: string) {
  const res = await fetch(
    "https://graph.facebook.com/me?fields=id,name,email",
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchAll<T = any>(initialUrl: string, accessToken: string) {
  const collected: T[] = [];
  let url: string | null = `${initialUrl}${initialUrl.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  while (url) {
    const res: Response = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Facebook request failed (${res.status}): ${text}`);
    }
    const json: any = await res.json();
    const data: T[] = json?.data ?? [];
    collected.push(...data);
    url = json?.paging?.next ?? null;
  }
  return collected;
}

async function fetchPages(accessToken: string) {
  return fetchAll<{ id: string; name?: string; link?: string; access_token?: string }>(
    "https://graph.facebook.com/v23.0/me/accounts?fields=id,name,link,access_token",
    accessToken
  );
}

async function fetchIgAccountsForPage(pageId: string, pageAccessToken: string) {
  return fetchAll<{ id: string; username?: string; name?: string; profile_picture_url?: string }>(
    `https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/instagram_accounts?fields=id,username,name,profile_picture_url`,
    pageAccessToken
  );
}

async function fetchAdAccounts(accessToken: string) {
  return fetchAll<{ id: string; name?: string; account_status?: number; currency?: string; timezone_name?: string }>(
    "https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name",
    accessToken
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  const oauthState = decodeConnectionOAuthState(rawState);
  let context;

  try {
    context = await resolveConnectionContext({
      requestedOwnerId: oauthState?.ownerId,
      requestedWorkspaceId: oauthState?.workspaceId,
      requestedLocale: oauthState?.locale,
    });
  } catch (error: any) {
    const status = error instanceof ConnectionOAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || "Unable to validate Facebook connection" },
      { status }
    );
  }

  const ownerId = context.ownerId;
  const returnPath =
    context.viewerRole === "admin"
      ? process.env.FACEBOOK_SUCCESS_REDIRECT_URL || `/${context.locale}/admin`
      : buildAnalyticsConnectionsPath(context);

  const redirectUri = process.env.FACEBOOK_REDIRECT_URL;
  if (!redirectUri) {
    return NextResponse.json({ error: "Missing FACEBOOK_REDIRECT_URL env" }, { status: 500 });
  }

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    let accessToken: string | undefined = tokenData?.access_token;
    let expiresIn = tokenData?.expires_in;
    const runId = Math.random().toString(36).slice(2, 8);

    // Attempt to exchange for a long-lived token
    if (accessToken) {
      const extended = await extendToken(accessToken);
      if (extended?.access_token) {
        accessToken = extended.access_token;
        expiresIn = extended.expires_in ?? expiresIn;
      }
    }

    if (!accessToken) {
      throw new Error("No access token returned from Facebook");
    }

    const expiresAt =
      expiresIn && !Number.isNaN(Number(expiresIn))
        ? new Date(Date.now() + Number(expiresIn) * 1000)
        : null;

    const profile = await fetchProfile(accessToken);
    const facebookId = profile?.id || rawState || "unknown_facebook_user";
    const email = profile?.email ?? null;
    const name = profile?.name ?? null;

    await connectDB();
    const facebookUser = await FacebookUser.findOneAndUpdate(
      { facebookId },
      {
        facebookId,
        adminId: ownerId,
        email,
        name,
        accessToken,
        tokenType: tokenData?.token_type ?? "Bearer",
        expiresAt,
        state: rawState,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const facebookUserId = facebookUser._id;
    let pagesCount = 0;
    let igCount = 0;
    let adCount = 0;
    let warning: string | null = null;

    try {
      // 1) Pages
      const pages = await fetchPages(accessToken);

      // Enforce Subscription Limit
      await checkSubscriptionLimit(ownerId, "facebookPages");

      pagesCount = pages.length;
      await Promise.all(
        pages.map((p) =>
          Page.findOneAndUpdate(
            { pageId: p.id },
            {
              userId: facebookUserId,
              pageId: p.id,
              name: p.name ?? null,
              link: p.link ?? null,
              accessToken: p.access_token ?? accessToken,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        )
      );

      // 2) Instagram accounts (per page)
      const igPromises: Promise<any>[] = [];
      for (const p of pages) {
        const pageToken = p.access_token ?? accessToken;
        if (!pageToken) continue;
        igPromises.push(
          (async () => {
            const igs = await fetchIgAccountsForPage(p.id, pageToken);

            // Enforce Subscription Limit
            await checkSubscriptionLimit(ownerId, "instagramAccounts");

            igCount += igs.length;
            await Promise.all(
              igs.map((ig) =>
                InstagramAccount.findOneAndUpdate(
                  { igId: ig.id },
                  {
                    userId: facebookUserId,
                    igId: ig.id,
                    username: ig.username ?? null,
                    name: ig.name ?? null,
                    profile_picture_url: ig.profile_picture_url ?? null,
                    pageId: p.id,
                  },
                  { upsert: true, new: true, setDefaultsOnInsert: true }
                )
              )
            );
          })()
        );
      }
      await Promise.all(igPromises);

      // 3) Ad accounts
      const adAccounts = await fetchAdAccounts(accessToken);

      // Enforce Subscription Limit
      await checkSubscriptionLimit(ownerId, "adAccounts");

      adCount = adAccounts.length;
      await Promise.all(
        adAccounts.map((acc) =>
          AdAccount.findOneAndUpdate(
            { adAccountId: acc.id },
            {
              userId: facebookUserId,
              adAccountId: acc.id,
              name: acc.name ?? null,
              account_status: acc.account_status ?? null,
              currency: acc.currency ?? null,
              timezone_name: acc.timezone_name ?? null,
              accessToken,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        )
      );
    } catch (e: any) {
      console.error(`[Facebook Callback ${runId}] sync error:`, e);
      warning = e?.message ?? "Sync failed";
    }

    const redirectUrl = new URL(
      returnPath,
      getAppBaseUrl(url.origin)
    );
    redirectUrl.searchParams.set("facebookConnected", "1");
    redirectUrl.searchParams.set("pages", String(pagesCount));
    redirectUrl.searchParams.set("igs", String(igCount));
    redirectUrl.searchParams.set("ads", String(adCount));
    if (warning) redirectUrl.searchParams.set("warning", warning);
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error("[Facebook Callback] Error:", error);
    return NextResponse.json({ error: error?.message || "Facebook connect failed" }, { status: 500 });
  }
}
