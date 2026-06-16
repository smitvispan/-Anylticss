import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleAdsInsight from "@/models/GoogleAdsInsight";
import {
  loadCampaignsFromDb,
  loadCampaignsFromInsights,
  syncGoogleCampaignsForAccount,
  serializeCampaignDoc,
} from "@/lib/syncGoogleAds";

function normalizeCustomerId(raw?: string | null) {
  if (!raw) return "";
  return String(raw).replace(/^customers\//i, "").replace(/[^\d-]/g, "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerIdParam = searchParams.get("customerId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const accountIdParam = searchParams.get("accountId");
  const normalizedCustomerId = normalizeCustomerId(customerIdParam || undefined);
  const dateRange = start && end ? { since: start, until: end } : null;
  const requestedCustomerId = normalizedCustomerId || undefined;
  const managerId = process.env.GOOGLE_MANAGER_ID ? normalizeCustomerId(process.env.GOOGLE_MANAGER_ID) : undefined;
  console.log("[Campaigns API][GET] Incoming", {
    customerIdParam,
    normalizedCustomerId,
    accountIdParam,
    dateRange,
  });

  // Resolve the Google Ads account up-front; avoids duplicated lookups and lets us pull insights.
  let accountDoc = null as any;
  if (accountIdParam && isValidObjectId(accountIdParam)) {
    accountDoc = await GoogleAdsAccount.findById(accountIdParam).lean();
  }
  if (!accountDoc && normalizedCustomerId) {
    accountDoc = await GoogleAdsAccount.findOne({
      $or: [{ accountId: normalizedCustomerId }, { customerId: normalizedCustomerId }],
    }).lean();
  }
  console.log("[Campaigns API][GET] Resolved account", {
    found: !!accountDoc,
    accountId: accountDoc?._id ? String(accountDoc._id) : null,
    accountCustomerId: accountDoc?.customerId,
    accountAccountId: accountDoc?.accountId,
  });

  const syncCustomerId =
    requestedCustomerId || normalizeCustomerId(accountDoc?.customerId || accountDoc?.accountId);
  const accountCustomerId = normalizeCustomerId(accountDoc?.accountId || accountDoc?.customerId);
  const accountIsManager = !!accountDoc?.manager || (!!managerId && accountCustomerId === managerId);

  let campaigns = await loadCampaignsFromDb({
    customerId: requestedCustomerId || customerIdParam || undefined,
    subAccountId: accountDoc?._id ? String(accountDoc._id) : undefined,
  });
  if (!campaigns.length && accountDoc?._id) {
    campaigns = await loadCampaignsFromInsights({
      customerId: requestedCustomerId || customerIdParam || syncCustomerId || undefined,
      subAccountId: String(accountDoc._id),
      dateRange: dateRange || undefined,
    });
  }
  console.log("[Campaigns API][GET] Loaded campaigns from DB", {
    count: campaigns.length,
    subAccountId: accountDoc?._id ? String(accountDoc._id) : null,
  });

  // If a date range is provided, attempt to attach insights for that range.
  let insights: any[] = [];
  if (dateRange && accountDoc?._id) {
    const insightQuery: Record<string, any> = {
      googleAdsAccountId: accountDoc._id,
      ...(dateRange.since ? { "dateRange.since": dateRange.since } : {}),
      ...(dateRange.until ? { "dateRange.until": dateRange.until } : {}),
    };
    if (requestedCustomerId) insightQuery.customerId = requestedCustomerId;
    insights = await GoogleAdsInsight.find(insightQuery).lean();
  }
  console.log("[Campaigns API][GET] Loaded insights", { count: insights.length });

  const hasInsightMetrics = (ins: any) => {
    const metric = ins?.metric;
    if (!metric || typeof metric !== "object") return false;
    return Object.keys(metric).some((key) => key !== "fetchedAt" && key !== "since" && key !== "until");
  };
  const insightsHaveMetrics = insights.some(hasInsightMetrics);
  const skipMetricCheck = accountIsManager && requestedCustomerId === managerId;
  const metricsMissing = !!dateRange && !skipMetricCheck && !insightsHaveMetrics;

  const applyInsights = (items: any[], insightDocs: any[]) => {
    if (!insightDocs?.length) return items;
    const byCampaign = new Map<string, any>();
    for (const ins of insightDocs) {
      if (ins.campaignId) byCampaign.set(String(ins.campaignId), ins);
    }
    return items.map((c) => {
      const match = byCampaign.get(String(c.campaignId));
      return match ? { ...c, metrics: match.metric || c.metrics } : c;
    });
  };

  let resultCampaigns = applyInsights(campaigns, insights);

  // Auto-sync if nothing exists for the requested range/customer (no campaigns or no insights for range).
  const canSync = !!accountDoc && !!syncCustomerId;
  const shouldSync =
    canSync && (!resultCampaigns.length || (dateRange && (!insights.length || metricsMissing)));
  console.log("[Campaigns API][GET] Should sync?", {
    shouldSync,
    canSync,
    resultCampaignsCount: resultCampaigns.length,
    insightsCount: insights.length,
    metricsMissing,
  });

  if (shouldSync) {
    try {
      const syncResult = await syncGoogleCampaignsForAccount({
        googleAdsAccountId: String(accountDoc._id),
        customerId: syncCustomerId,
        dateRange: dateRange || undefined,
      });
      resultCampaigns = syncResult.campaigns || [];
      console.log("[Campaigns API][GET] Sync result", {
        campaigns: resultCampaigns.length,
        customerId: syncResult.customerId,
        count: syncResult.count,
      });

      // Re-attach insights if date range requested
      if (dateRange) {
        const refreshedQuery: Record<string, any> = {
          googleAdsAccountId: accountDoc._id,
          ...(dateRange.since ? { "dateRange.since": dateRange.since } : {}),
          ...(dateRange.until ? { "dateRange.until": dateRange.until } : {}),
        };
        if (requestedCustomerId) refreshedQuery.customerId = requestedCustomerId;
        const refreshedInsights = await GoogleAdsInsight.find(refreshedQuery).lean();
        resultCampaigns = applyInsights(resultCampaigns, refreshedInsights);
        console.log("[Campaigns API][GET] Re-attached insights after sync", {
          refreshedInsights: refreshedInsights.length,
        });
      }
    } catch (e) {
      console.error("[Campaigns API] Auto-sync failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    campaigns: resultCampaigns.map(serializeCampaignDoc),
    filteredBy: customerIdParam || normalizedCustomerId || "all",
    dateRange: dateRange ? { start, end } : null,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { accountId, customerId, userId, start, end } = body || {};
  const dateRange = start && end ? { since: start, until: end } : undefined;
  console.log("[Campaigns API][POST] Incoming", { accountId, customerId, userId, dateRange });

  if (!accountId || !isValidObjectId(accountId)) {
    return NextResponse.json({ ok: false, error: "Valid Google Ads account id is required" }, { status: 400 });
  }

  try {
    const syncResult = await syncGoogleCampaignsForAccount({
      googleAdsAccountId: accountId,
      customerId,
      userId: userId && isValidObjectId(userId) ? userId : undefined,
      dateRange,
    });

    return NextResponse.json({
      ok: true,
      campaigns: (syncResult.campaigns || []).map(serializeCampaignDoc),
      customerId: syncResult.customerId,
      synced: syncResult.count,
    });
  } catch (e: any) {
    console.error("[Campaigns API] Sync failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Sync failed" }, { status: 500 });
  }
}
