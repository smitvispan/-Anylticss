import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import GoogleAdsAccount, { IGoogleAdsAccount } from "@/models/GoogleAdsAccount";
import GoogleAdsInsight from "@/models/GoogleAdsInsight";
import User from "@/models/User";
import { ensureGoogleAdsAccessToken } from "./googleAuth";

type DateRange = { since?: string; until?: string };

function normalizeCustomerId(raw?: string | null) {
  if (!raw) return "";
  return String(raw).replace(/^customers\//i, "").replace(/[^\d-]/g, "");
}

type FetchCampaignOpts = {
  includeMetrics?: boolean;
  dateRange?: DateRange;
};

async function fetchCustomerClients(
  accessToken: string,
  loginCustomerId?: string
): Promise<any[]> {
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v19";
  const url = `https://googleads.googleapis.com/${apiVersion}/customers/${loginCustomerId || "-"}/googleAds:search`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    "Content-Type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  console.log("[GoogleAds] fetchCustomerClients start", {
    apiVersion,
    url,
    loginCustomerId,
    hasAccessToken: !!accessToken,
    hasDeveloperToken: !!headers["developer-token"],
  });

  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.hidden,
      customer_client.manager,
      customer_client.time_zone,
      customer_client.test_account
    FROM customer_client
    WHERE customer_client.hidden = FALSE
    LIMIT 50
  `;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  const text = await res.text();
  console.log("[GoogleAds] fetchCustomerClients response", {
    status: res.status,
    ok: res.ok,
    contentLength: text?.length || 0,
  });
  if (!res.ok) {
    console.warn("[GoogleAds] Customer client listing failed", { status: res.status, body: text });
    return [];
  }
  const data = text ? JSON.parse(text) : {};
  const results = Array.isArray(data) ? data[0]?.results ?? [] : data?.results ?? [];
  console.log("[GoogleAds] fetchCustomerClients parsed", {
    count: results.length,
    sample: results.slice(0, 3).map((c: any) => ({
      id: c.customerClient?.id,
      name: c.customerClient?.descriptiveName,
      manager: c.customerClient?.manager,
      hidden: c.customerClient?.hidden,
    })),
  });
  return results;
}

async function fetchCampaignRows(
  accessToken: string,
  customerId: string,
  loginCustomerId?: string,
  opts: FetchCampaignOpts = {}
) {
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v19";
  const url = `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`;

  const includeMetrics = opts.includeMetrics !== false;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    "Content-Type": "application/json",
  };

  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }else if (process.env.GOOGLE_MANAGER_ID) {
    headers["login-customer-id"] = normalizeCustomerId(process.env.GOOGLE_MANAGER_ID);
  }

  const metricFields = includeMetrics
    ? [
        "metrics.clicks",
        "metrics.impressions",
        "metrics.ctr",
        "metrics.average_cpc",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.all_conversions",
        "metrics.all_conversions_value",
        "metrics.video_views",
      ]
    : [];

  const selectFields = [
    "campaign.id",
    "campaign.name",
    "campaign.status",
    "campaign.advertising_channel_type",
    "campaign.bidding_strategy_type",
    "campaign_budget.amount_micros",
    ...metricFields,
  ];

  const where: string[] = ["campaign.status != 'REMOVED'"];
  if (opts.dateRange?.since && opts.dateRange?.until) {
    where.push(`segments.date BETWEEN '${opts.dateRange.since}' AND '${opts.dateRange.until}'`);
  }

  const query = `
    SELECT
      ${selectFields.join(",\n      ")}
    FROM campaign
    WHERE ${where.join(" AND ")}
    LIMIT 200
  `;

  console.log("[GoogleAds] Fetching campaigns", {
    url,
    customerId,
    loginCustomerId,
    includeMetrics,
    dateRange: opts.dateRange,
    query: query.trim().replace(/\s+/g, " "),
    hasAccessToken: accessToken,
    hasDeveloperToken: headers["developer-token"],
    apiVersion,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    const text = await res.text();
    console.log("[GoogleAds] Raw response meta", {
      status: res.status,
      ok: res.ok,
      contentLength: text || 0,
    });

    if (!res.ok) {
      const parsedError = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();

      const isManagerMetricError = !!parsedError?.error?.details?.[0]?.errors?.some(
        (e: any) => e?.errorCode?.queryError === "REQUESTED_METRICS_FOR_MANAGER"
      );

      if (includeMetrics && isManagerMetricError) {
        console.warn("[GoogleAds] Metrics query rejected for manager account, retrying without metrics");
        return fetchCampaignRows(accessToken, customerId, loginCustomerId, { includeMetrics: false });
      }

      console.error("[GoogleAds] API error response", { status: res.status, body: text });
      const err = new Error(`Google Ads API error (${res.status}): ${text}`);
      (err as any).status = res.status;
      (err as any).body = text;
      throw err;
    }

    const data = text ? JSON.parse(text) : {};
    const results = Array.isArray(data) ? data[0]?.results ?? [] : data?.results ?? [];

    if (!results.length) {
      console.warn("[GoogleAds] No campaign rows returned", {
        customerId,
        loginCustomerId,
        includeMetrics,
        topLevelKeys: data && typeof data === "object" ? Object.keys(data) : null,
        sample: typeof text === "string" ? text.slice(0, 500) : "",
      });
      // Helpful debug: list visible customer clients under the manager login.
      if (loginCustomerId) {
        const clients = await fetchCustomerClients(accessToken, loginCustomerId);
        console.info("[GoogleAds] Visible client accounts under manager", {
          loginCustomerId,
          count: clients.length,
          sample: clients.slice(0, 5).map((c: any) => ({
            id: c.customerClient?.id,
            name: c.customerClient?.descriptiveName,
            manager: c.customerClient?.manager,
            hidden: c.customerClient?.hidden,
          })),
        });
      }
    } else {
      console.info("[GoogleAds] Campaign rows fetched", { count: results.length, customerId, loginCustomerId });
    }
    return results;
  } catch (err) {
    console.error("[GoogleAds] Error fetching campaign rows:", err);
    throw err;
  }
}

async function upsertInsights(
  accountId: string,
  customerId: string,
  campaignId: string,
  name: string | undefined,
  metric: Record<string, any>,
  range?: DateRange
) {
  try {
    const normalizedRange = {
      since: range?.since ?? null,
      until: range?.until ?? null,
    };

    const prev = await GoogleAdsInsight.findOne({
      googleAdsAccountId: accountId,
      campaignId,
      customerId,
      "dateRange.since": normalizedRange.since,
      "dateRange.until": normalizedRange.until,
    })
      .select({ metric: 1, history: 1 })
      .lean();

    const history = prev?.metric
      ? [{ metric: prev.metric, archivedAt: new Date() }, ...(prev.history || [])].slice(0, 20)
      : prev?.history || [];

    await GoogleAdsInsight.findOneAndUpdate(
      {
        googleAdsAccountId: accountId,
        campaignId,
        customerId,
        "dateRange.since": normalizedRange.since,
        "dateRange.until": normalizedRange.until,
      },
      {
        $set: {
          name,
          metric: { ...metric, fetchedAt: new Date().toISOString(), since: range?.since, until: range?.until },
          history,
          dateRange: normalizedRange,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[GoogleAds] Error upserting insights:", err);
    throw err;
  }
}

export async function syncGoogleCampaignsForAccount(opts: {
  googleAdsAccountId: string;
  customerId?: string | null;
  userId?: string | null;
  dateRange?: DateRange;
}) {
  await connectDB();

  const account = await GoogleAdsAccount.findById(opts.googleAdsAccountId).lean();
  if (!account) {
    throw new Error("Google Ads account not found");
  }

  const customerId = normalizeCustomerId(opts.customerId || account.accountId || account.customerId);
  if (!customerId) {
    throw new Error("Missing Google Ads customer ID");
  }

  let accessToken = await ensureGoogleAdsAccessToken(account);
  const managerId = process.env.GOOGLE_MANAGER_ID ? normalizeCustomerId(process.env.GOOGLE_MANAGER_ID) : undefined;
  const isManagerAccount = !!account.manager || (!!managerId && customerId === managerId);
  const fetchOpts: FetchCampaignOpts = { includeMetrics: !isManagerAccount, dateRange: opts.dateRange };
  if (isManagerAccount) {
    console.info("[GoogleAds] Manager account detected, initial attempt without metrics on manager account");
  }
  console.log("[GoogleAds] Sync starting", {
    googleAdsAccountId: String(account._id),
    customerId,
    accountCustomerId: account.customerId,
    accountAccountId: account.accountId,
    managerId,
    isManagerAccount,
    includeMetrics: fetchOpts.includeMetrics,
    dateRange: opts.dateRange,
    hasRefreshToken: !!account.refreshToken,
    hasAccessToken: !!account.accessToken,
    expiresAt: account.expiresAt,
    scope: account.scope,
  });

  const candidateCustomerIds: string[] = [customerId];
  if (isManagerAccount) {
    const children = await fetchCustomerClients(accessToken, customerId);
    const childIds = children
      .map((c: any) => normalizeCustomerId(c.customerClient?.id))
      .filter(Boolean);
    candidateCustomerIds.push(...childIds);
    console.log("[GoogleAds] Manager candidate list (self + children)", {
      parent: customerId,
      children: childIds.slice(0, 10),
      total: childIds.length,
    });
  }

  let rows: any[] = [];
  let resolvedCustomerId = customerId;
  for (const targetCustomerId of candidateCustomerIds) {
    const targetIsManager = targetCustomerId === managerId || (isManagerAccount && targetCustomerId === customerId);
    const optsForTarget: FetchCampaignOpts = {
      includeMetrics: !targetIsManager,
      dateRange: opts.dateRange,
    };
    const loginId = managerId && targetCustomerId !== managerId ? managerId : undefined;

    try {
      rows = await fetchCampaignRows(accessToken, targetCustomerId, loginId, optsForTarget);
    } catch (err: any) {
      const isAuthError = err?.status === 401 || String(err?.body || "").includes("UNAUTHENTICATED");
      if (!isAuthError) throw err;

      accessToken = await ensureGoogleAdsAccessToken(account, { forceRefresh: true });
      rows = await fetchCampaignRows(accessToken, targetCustomerId, loginId, optsForTarget);
    }

    if (rows?.length) {
      resolvedCustomerId = targetCustomerId;
      console.info("[GoogleAds] Campaigns found for customer", { targetCustomerId, count: rows.length });
      break;
    } else {
      console.warn("[GoogleAds] No campaigns for customer, trying next candidate", { targetCustomerId });
    }
  }

  console.info("[GoogleAds] Sync fetched rows", { customerId: resolvedCustomerId, count: rows?.length || 0 });
  const upserts = [];

  for (const row of rows) {
    const c = row.campaign || {};
    const metrics = row.metrics || {};
    const budget = row.campaignBudget || {};

    const payload = {
      campaignId: String(c.id ?? ""),
      userId: opts.userId || undefined,
      userEmail: account.userEmail || undefined,
      name: c.name,
      status: c.status,
      advertisingChannelType: c.advertisingChannelType,
      campaignBudgetAmountMicros: String(budget.amountMicros ?? ""),
      metrics,
      biddingStrategyType: c.biddingStrategyType,
      customerId: resolvedCustomerId,
      subAccountId: account._id,
    };

    const doc = await Campaign.findOneAndUpdate(
      { campaignId: payload.campaignId, customerId: resolvedCustomerId },
      { $set: { ...payload, updatedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();

    upserts.push(doc);

    await upsertInsights(
      String(account._id),
      resolvedCustomerId,
      payload.campaignId,
      c.name,
      metrics,
      opts.dateRange
    );
  }

  return {
    campaigns: upserts,
    customerId: resolvedCustomerId,
    count: upserts.length,
  };
}

export async function loadCampaignsFromDb(filter: { customerId?: string; subAccountId?: string }) {
  await connectDB();

  const query: any = {};
  if (filter.customerId) query.customerId = filter.customerId;
  if (filter.subAccountId) query.subAccountId = filter.subAccountId;

  return Campaign.find(query).sort({ updatedAt: -1 }).lean();
}

export async function resolveGoogleAdsAccountForUser(userId: string) {
  await connectDB();

  const user = await User.findById(userId)
    .select({ _id: 1, email: 1, mainGoogleAd: 1, googleAdsAccounts: 1 })
    .lean();
  if (!user) return { user: null, account: null };

  const candidateIds = [
    user.mainGoogleAd,
    ...(Array.isArray(user.googleAdsAccounts) ? user.googleAdsAccounts : []),
  ].filter(Boolean);

  let account = candidateIds.length
    ? await GoogleAdsAccount.findOne({ _id: { $in: candidateIds } }).lean()
    : null;

  if (!account && user.email) {
    account = await GoogleAdsAccount.findOne({ userEmail: user.email }).sort({ updatedAt: -1 }).lean();
  }

  return { user, account };
}

/**
 * Safely serialize a campaign doc for client components.
 */
export function serializeCampaignDoc(campaign: any) {
  const safeMetrics = campaign?.metrics ? JSON.parse(JSON.stringify(campaign.metrics)) : {};
  const createdAt =
    campaign?.createdAt instanceof Date
      ? campaign.createdAt.toISOString()
      : campaign?.createdAt
      ? new Date(campaign.createdAt).toISOString()
      : undefined;
  const updatedAt =
    campaign?.updatedAt instanceof Date
      ? campaign.updatedAt.toISOString()
      : campaign?.updatedAt
      ? new Date(campaign.updatedAt).toISOString()
      : undefined;

  return {
    id: campaign?._id ? String(campaign._id) : `${campaign?.customerId}-${campaign?.campaignId}`,
    campaignId: campaign?.campaignId ? String(campaign.campaignId) : undefined,
    customerId: campaign?.customerId ? String(campaign.customerId) : undefined,
    name: campaign?.name,
    status: campaign?.status,
    advertisingChannelType: campaign?.advertisingChannelType,
    biddingStrategyType: campaign?.biddingStrategyType,
    campaignBudgetAmountMicros: campaign?.campaignBudgetAmountMicros,
    metrics: safeMetrics,
    userEmail: campaign?.userEmail,
    userId: campaign?.userId ? String(campaign.userId) : undefined,
    subAccountId: campaign?.subAccountId ? String(campaign.subAccountId) : undefined,
    createdAt,
    updatedAt,
  };
}
