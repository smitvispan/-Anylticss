// lib/syncAdAccountInsights.ts
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import AdAccountInsights from "@/models/AdAccountInsights";
import MetaAdset from "@/models/MetaAdset";
import MetaCampaign from "@/models/MetaCampaign";

/** ================== Types ================== */
type FieldId = string;

type Params = {
  userId?: string;
  pageId?: string;
  instagramId?: string;
  adAccountId?: string; // Mongo AdAccount._id
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  campaigns_id?: string;
  adsets_id?: string;
};

type FBCampaign = { id: string; name?: string };
type FBAdSet = { id: string; name?: string };
type FBInsightsRow = Record<string, any> & {
  adset_name?: string;
  campaign_name?: string;
  account_name?: string;
  adset_id?: string;
  campaign_id?: string;
  actions?: Array<{ action_type: string; value: number }>;
  action_values?: Array<{ action_type: string; value: number }>;
};
type FBErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
};

type AdsetDoc = {
  id: string;
  name: string | null;
  adsetid: string | null;
  adsetname: string | null;
  fbEntityId: string | null;
  metric: any;
};

type AdsetMetricPayload = {
  metric: FBInsightsRow[];
  created: string; // ISO
  since: string;
  until: string;
};

type HistoryEntry = {
  metric: AdsetMetricPayload;
  archivedAt: string;
};

/** ================== Constants ================== */
const INSIGHT_FIELDS =
  "adset_name,campaign_name,account_name,impressions,reach,clicks,spend,ctr,cpc,cpm,unique_clicks,actions,action_values,ad_name,ad_id,adset_id,campaign_id,frequency,inline_link_clicks,unique_inline_link_clicks,website_ctr,conversions,account_currency";

const MAX_HISTORY_ENTRIES = 30;

/** ================== Helpers ================== */
export function parseFieldId(fieldId: FieldId) {
  const [rawMetric, rawGroup] = fieldId.split("___");
  const parts = (rawMetric || "").split("_");
  const source = parts[parts.length - 1];
  const metricParts = parts.slice(0, parts.length - 1);
  const metric = metricParts.join("_") || rawMetric;
  const group = (rawGroup || "").toLowerCase().replace(/\s+/g, "_");
  return { metric, group, source };
}

function flattenActions(row: FBInsightsRow) {
  const out = { ...row };
  if (Array.isArray(row.actions)) {
    for (const a of row.actions) {
      if (a?.action_type != null && a?.value != null) out[a.action_type] = a.value;
    }
    delete out.actions;
  }
  if (Array.isArray(row.action_values)) {
    for (const a of row.action_values) {
      if (a?.action_type != null && a?.value != null) out[`${a.action_type}_value`] = a.value;
    }
    delete out.action_values;
  }
  return out;
}

function isoDateOnly(d: Date) {
  return d.toISOString().split("T")[0];
}

function asActId(id: string) {
  return id.startsWith("act_") ? id : `act_${id}`;
}

function rollHistory(
  prevMetric: AdsetMetricPayload | null | undefined,
  prevHistory: HistoryEntry[] | null | undefined
): HistoryEntry[] {
  const base = Array.isArray(prevHistory) ? prevHistory : [];
  if (!prevMetric) return base;
  const entry: HistoryEntry = { metric: prevMetric, archivedAt: new Date().toISOString() };
  return [entry, ...base].slice(0, MAX_HISTORY_ENTRIES);
}

function isValidDateString(value?: string | null) {
  if (!value || typeof value !== "string") return false;
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function validateDateRange(since?: string, until?: string) {
  const defaultSince = isoDateOnly(new Date(Date.now() - 24 * 3600 * 1000));
  const defaultUntil = isoDateOnly(new Date());

  const normalizedSince = isValidDateString(since) ? (since as string) : defaultSince;
  const normalizedUntil = isValidDateString(until) ? (until as string) : defaultUntil;

  const start = new Date(normalizedSince);
  const end = new Date(normalizedUntil);
  if (start.getTime() > end.getTime()) {
    throw new Error(`Invalid date range: since (${normalizedSince}) is after until (${normalizedUntil})`);
  }

  return { since: normalizedSince, until: normalizedUntil };
}

/** ================== Facebook fetchers ================== */
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRateLimitError(payload: FBErrorPayload | null | undefined) {
  const code = payload?.error?.code;
  const subcode = payload?.error?.error_subcode;
  return code === 17 || code === 4 || subcode === 2446079;
}

function retryDelayMs(attempt: number, res?: Response) {
  const retryAfter = res?.headers?.get("retry-after") ?? "";
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) return Math.min(seconds * 1000, 30_000);
    const dateMs = Date.parse(retryAfter);
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  }
  const backoff = Math.min(500 * 2 ** attempt, 5_000);
  return backoff + Math.floor(Math.random() * 250);
}

async function fetchFbJson<T>(url: string, label: string, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const json = safeJsonParse(text) as (T & FBErrorPayload) | null;
    const fbError = json && typeof json === "object" && "error" in json ? (json as FBErrorPayload) : null;

    if (res.ok && !fbError?.error) {
      return (json ?? ({} as T)) as T;
    }

    if (isRateLimitError(fbError) && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, res)));
      continue;
    }

    throw new Error(`${label} failed: ${res.status} ${text}`);
  }

  throw new Error(`${label} failed: max retries exceeded`);
}

async function fetchAdsetInsightsPage(
  fbAdAccountId: string,
  accessToken: string,
  since: string,
  until: string,
  next?: string
): Promise<{ rows: FBInsightsRow[]; nextUrl: string | null }> {
  const u = next
    ? new URL(next)
    : new URL(`${getMetaGraphApiBase()}/${encodeURIComponent(fbAdAccountId)}/insights`);

  if (!next) {
    u.searchParams.set("access_token", accessToken);
    u.searchParams.set("fields", INSIGHT_FIELDS);
    u.searchParams.set("level", "adset");
    u.searchParams.set("limit", "200");
    u.searchParams.set("since", since);
    u.searchParams.set("until", until);
  }

  const json = await fetchFbJson<{ data?: FBInsightsRow[]; paging?: { next?: string } }>(
    u.toString(),
    "FB /insights"
  );
  return { rows: (json?.data ?? []) as FBInsightsRow[], nextUrl: json?.paging?.next ?? null };
}

/** ================== Upsert cache with history ================== */
async function upsertCampaignDoc(args: {
  adAccountInternalId: string;
  campaign: FBCampaign;
  syncedAt: Date;
}) {
  const { adAccountInternalId, campaign, syncedAt } = args;

  await MetaCampaign.findOneAndUpdate(
    { adAccountId: adAccountInternalId, fbCampaignId: campaign.id },
    {
      adAccountId: adAccountInternalId,
      fbCampaignId: campaign.id,
      name: campaign.name ?? null,
      lastSyncedAt: syncedAt,
    },
    { upsert: true, new: true }
  );
}

async function upsertAdsetInsightDoc(args: {
  adAccountInternalId: string;
  campaign: FBCampaign;
  adset: FBAdSet;
  rows: FBInsightsRow[];
  since: string;
  until: string;
  syncedAt: Date;
}) {
  const { adAccountInternalId, campaign, adset, rows, since, until, syncedAt } = args;

  const transformed = rows.map(flattenActions);

  const newMetric: AdsetMetricPayload = {
    metric: transformed,
    created: new Date().toISOString(),
    since,
    until,
  };

  const existing = await AdAccountInsights.findOne({ adsetid: adset.id }).lean();

  const prevMetric = existing?.metric as AdsetMetricPayload | undefined;
  const prevHistory = existing?.history as HistoryEntry[] | undefined;
  const newHistory = rollHistory(prevMetric ?? null, prevHistory ?? []);

  await AdAccountInsights.findOneAndUpdate(
    { adsetid: adset.id },
    {
      adAccountId: adAccountInternalId,
      name: campaign.name ?? null,
      fbEntityId: campaign.id ?? null,
      adsetname: adset.name ?? null,
      adsetid: adset.id ?? null,
      metric: newMetric as any,
      history: newHistory as any,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  await MetaAdset.findOneAndUpdate(
    { fbAdsetId: adset.id || "", since, until },
    {
      adAccountId: adAccountInternalId,
      fbCampaignId: campaign.id || "",
      adAccountMongoId: adAccountInternalId, // keeps ad account reference available for quick filters
      fbCampaignName: campaign.name ?? null,
      fbAdsetId: adset.id || "",
      fbAdsetName: adset.name ?? null,
      since,
      until,
      metrics: newMetric as any,
      updatedAt: syncedAt,
    },
    { upsert: true, new: true }
  );
}

/** ================== Public: sync ONE ad account ================== */
export async function syncAdAccountInsightsForAccount(
  adAccountInternalId: string,
  opts?: { since?: string; until?: string }
) {
  await connectDB();

  const acct = await AdAccount.findById(adAccountInternalId)
    .select({ _id: 1, adAccountId: 1, accessToken: 1, name: 1 })
    .lean();
  if (!acct) throw new Error(`AdAccount not found: ${adAccountInternalId}`);
  if (!acct.adAccountId || !acct.accessToken) {
    throw new Error(`Missing FB id or access token for AdAccount ${adAccountInternalId}`);
  }

  const { since, until } = validateDateRange(opts?.since, opts?.until);

  let nextUrl: string | null = null;
  const actId = asActId(acct.adAccountId);
  const syncedAt = new Date();
  const campaignCache = new Map<string, string | null>();

  do {
    const { rows, nextUrl: nxt } = await fetchAdsetInsightsPage(
      actId,
      acct.accessToken,
      since,
      until,
      nextUrl || undefined
    );

    for (const row of rows) {
      if (!row?.adset_id || !row?.campaign_id) continue;

      const campaignId = row.campaign_id;
      const campaignName = row.campaign_name ?? null;
      const cachedName = campaignCache.get(campaignId);
      if (!campaignCache.has(campaignId) || (cachedName == null && campaignName != null)) {
        await upsertCampaignDoc({
          adAccountInternalId,
          campaign: { id: campaignId, name: campaignName ?? undefined },
          syncedAt,
        });
        campaignCache.set(campaignId, campaignName ?? null);
      }

      await upsertAdsetInsightDoc({
        adAccountInternalId,
        campaign: { id: campaignId, name: campaignName ?? undefined },
        adset: { id: row.adset_id, name: row.adset_name ?? undefined },
        rows: [row],
        since,
        until,
        syncedAt,
      });
    }
    nextUrl = nxt;
  } while (nextUrl);

  return true;
}

/** ================== Public: sync ALL ad accounts with tokens ================== */
export async function syncAdAccountInsightsForAllAccounts(opts?: { since?: string; until?: string }) {
  await connectDB();
  const accounts = await AdAccount.find({ accessToken: { $ne: null } })
    .select("_id")
    .lean();

  const result: Record<string, { ok: boolean; error?: string }> = {};
  for (const a of accounts) {
    const id = String(a._id);
    try {
      await syncAdAccountInsightsForAccount(id, opts);
      result[id] = { ok: true };
    } catch (e: any) {
      console.error(`❌ syncAdAccountInsights failed for ${id}:`, e?.message || e);
      result[id] = { ok: false, error: e?.message || "error" };
    }
  }
  return result;
}

/** ================== Mapping (campaigns/adsets) — parity with Node ================== */
function campaigns_mapping(adsetDocs: AdsetDoc[]) {
  const result: Array<{ period: string; values: any }> = [];
  for (const doc of adsetDocs) {
    const period = (doc as any).fbEntityId || (doc as any).fbCampaignId || "";
    result.push({ period, values: doc });
  }
  return result;
}

function insightsData_mapping(adsetDocs: AdsetDoc[], adAccount: { name: string | null; adAccountId: string }) {
  const campaigns: Record<string, { name: string | null; adset: Array<Record<string, any>> }> = {};
  for (const doc of adsetDocs) {
    const campaignId = (doc as any).fbEntityId || (doc as any).fbCampaignId || "";
    if (!campaigns[campaignId]) {
      campaigns[campaignId] = { name: (doc as any).name ?? (doc as any).fbCampaignName ?? null, adset: [] };
    }
    campaigns[campaignId].adset.push({
      [(doc as any).adsetid as string]: (doc as any).adsetname,
      metric: (doc as any).metric,
    });
  }
  return {
    account_name: adAccount.name || adAccount.adAccountId,
    campaigns,
  };
}

/** ================== Public: rows builder (parity with Node fetchData) ================== */
export async function getAdInsightsRows(fields: FieldId[], id: Params) {
  await connectDB();

  const { adAccountId, startDate, endDate, campaigns_id, adsets_id } = id;
  const { since, until } = validateDateRange(startDate, endDate);

  if (!adAccountId && !campaigns_id && !adsets_id) {
    const mock: Record<string, number> = {};
    for (const f of fields) {
      const { metric } = parseFieldId(f);
      mock[f] = Math.floor(Math.random() * 1000);
    }
    return [mock];
  }

  const adsetsExisting = adAccountId
    ? await MetaAdset.find({ adAccountId, since, until }).lean()
    : [];

  let needsFetch = adsetsExisting.length === 0;
  if (!needsFetch) {
    needsFetch = adsetsExisting.some((doc) => {
      const metricData = (doc as any).metrics as any;
      return metricData?.since !== since || metricData?.until !== until;
    });
  }

  if (needsFetch && adAccountId) {
    await syncAdAccountInsightsForAccount(adAccountId, { since, until });
  }

  const docs = adAccountId
    ? await MetaAdset.find({ adAccountId, since, until }).lean()
    : [];

  const adAccount =
    adAccountId && docs.length
      ? await AdAccount.findById(adAccountId).select({ name: 1, adAccountId: 1 }).lean()
      : null;

  const docsForMapping = (docs as any[]).map((doc) => ({
    name: (doc as any).fbCampaignName ?? (doc as any).name ?? null,
    fbEntityId: (doc as any).fbCampaignId ?? (doc as any).fbEntityId ?? null,
    adsetname: (doc as any).fbAdsetName ?? (doc as any).adsetname ?? null,
    adsetid: (doc as any).fbAdsetId ?? (doc as any).adsetid ?? null,
    metric: (doc as any).metrics ?? (doc as any).metric,
  }));

  const campaignsData = campaigns_mapping(docsForMapping as any);
  const insightsData = adAccount ? insightsData_mapping(docsForMapping as any, adAccount as any) : null;

  const rows: Array<Record<string, number>> = [];

  for (const field of fields) {
    const { metric, group } = parseFieldId(field);

    if (metric === "campaigns" && insightsData) {
      rows.push({ [field]: campaignsData.length } as any);
      continue;
    }

    const campaignValue = campaignsData.find((c) => c.period === group);
    if (campaignValue && typeof campaignValue.values[metric] === "number") {
      rows.push({ [field]: campaignValue.values[metric] });
      continue;
    }

    rows.push({ [field]: 0 });
  }

  return rows;
}
import { getMetaGraphApiBase } from "@/lib/meta-api";
