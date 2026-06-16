// lib/analytics/syncInstagramInsights.ts
import connectDB from "@/lib/mongodb";
import InstagramAccount from "@/models/InstagramAccount";
import InstagramInsights from "@/models/InstagramInsights";

/** ===== Types ===== */
type IGPoint = number | Record<string, unknown>; // total_value.value is a number, but keep flexible
type IGInsightDict = Record<string, IGPoint>;     // metricName -> value
type IGInsightsDataShape = {
  day?: IGInsightDict;
  week?: IGInsightDict;
  days_28?: IGInsightDict;
  lifetime?: IGInsightDict;
};

type IGAccountInsight = {
  name: string;
  period: "day" | "week" | "days_28" | "lifetime";
  total_value?: { value: number } | null;
  values?: Array<{ end_time?: string; value: IGPoint }>;
};

/** What we store as the current snapshot under `metric` */
type IGInsightsMetricPayload = {
  insightsData: IGInsightsDataShape;
  fetchedAt: string; // ISO timestamp when we fetched
  since?: string;    // optional FB API since (ISO date)
  until?: string;    // optional FB API until (ISO date)
};

/** A single history item: the *old* metric snapshot, with when we archived it */
type HistoryEntry = {
  metric: IGInsightsMetricPayload;
  archivedAt: string;
};

const DEFAULT_IG_METRICS =
  "accounts_engaged,comments,follows_and_unfollows,likes,profile_links_taps,reach,replies,shares,views";

/** Keep at most N history entries (optional safety) */
const MAX_HISTORY_ENTRIES = 30;

/** Transform IG `/insights` (with metric_type=total_value) -> { period: { metricName: number|obj } } */
function transformIGInsightsData(list: IGAccountInsight[]): IGInsightsDataShape {
  const result: IGInsightsDataShape = {};
  for (const metric of list) {
    const { period, name } = metric;

    // Prefer total_value.value; fall back to raw values[] if the API returns a series
    const value: IGPoint =
      (metric.total_value?.value as number | undefined) ??
      (Array.isArray(metric.values) && metric.values.length > 0
        ? metric.values[metric.values.length - 1]?.value // last point if present
        : 0);

    if (!(result as any)[period]) (result as any)[period] = {};
    (result as any)[period][name] = value;
  }
  return result;
}

/** Build URL with IG insights params */
function buildIGInsightsUrl(
  igId: string,
  accessToken: string,
  metrics = DEFAULT_IG_METRICS,
  opts?: { period?: "day" | "week" | "days_28" | "lifetime"; since?: string; until?: string }
) {
  const u = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(igId)}/insights`);
  u.searchParams.set("metric", metrics);
  u.searchParams.set("metric_type", "total_value");
  u.searchParams.set("access_token", accessToken);

  // Default period=day unless caller overrides
  u.searchParams.set("period", opts?.period ?? "day");

  if (opts?.since) u.searchParams.set("since", opts.since);
  if (opts?.until) u.searchParams.set("until", opts.until);
  return u.toString();
}

/** Fetch insights for one IG account */
async function fetchInsightsForInstagram(
  igId: string,
  accessToken: string,
  opts?: { period?: "day" | "week" | "days_28" | "lifetime"; since?: string; until?: string }
): Promise<IGAccountInsight[]> {
  const url = buildIGInsightsUrl(igId, accessToken, DEFAULT_IG_METRICS, opts);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IG insights failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return (json?.data ?? []) as IGAccountInsight[];
}

/** Prepend previous metric to history, cap the array */
function rollHistory(
  prevMetric: IGInsightsMetricPayload | null | undefined,
  prevHistory: HistoryEntry[] | null | undefined
): HistoryEntry[] {
  const baseHistory = Array.isArray(prevHistory) ? prevHistory : [];
  if (!prevMetric) return baseHistory;

  const entry: HistoryEntry = {
    metric: prevMetric,
    archivedAt: new Date().toISOString(),
  };
  const next = [entry, ...baseHistory];
  return next.slice(0, MAX_HISTORY_ENTRIES);
}

/**
 * Upsert ONE InstagramInsights doc for an internal InstagramAccount (InstagramAccount.id).
 * On each update:
 *  - Move the existing `metric` snapshot to the FRONT of `history`
 *  - Save the new snapshot into `metric`
 * Requires InstagramInsights.instagramAccountId to be UNIQUE in schema.
 *
 * @param instagramInternalId internal Prisma id of InstagramAccount (ObjectId string)
 * @param opts optional { period, since, until }
 * @returns saved InstagramInsights.id or null (if missing token)
 */
export async function syncInstagramInsightsForAccount(
  instagramInternalId: string,
  opts?: { period?: "day" | "week" | "days_28" | "lifetime"; since?: string; until?: string }
) {
  await connectDB();

  // 1) Load the IG account (needs igId + pageAccessToken)
  const ig = await InstagramAccount.findById(instagramInternalId)
    .select({ _id: 1, igId: 1, pageAccessToken: 1, username: 1 })
    .lean();
  if (!ig) throw new Error(`InstagramAccount not found: ${instagramInternalId}`);
  if (!ig.igId || !ig.pageAccessToken) {
    console.warn(`Missing igId/token for IG account: ${ig.username ?? ig._id}`);
    return null;
  }

  // 2) Get previous snapshot (if any) to roll into history
  const prev = await InstagramInsights.findOne({ instagramAccountId: ig._id })
    .select({ metric: 1, history: 1 })
    .lean();

  // 3) Fetch current insights
  const list = await fetchInsightsForInstagram(ig.igId, ig.pageAccessToken, opts);
  if (!list.length) {
    console.warn(`No insights returned for IG account: ${ig.username ?? ig._id}`);
  }

  // 4) Build new metric snapshot
  const insightsData = transformIGInsightsData(list);
  const metricPayload: IGInsightsMetricPayload = {
    insightsData,
    fetchedAt: new Date().toISOString(),
    since: opts?.since,
    until: opts?.until,
  };

  // 5) Compute next history
  const newHistory = rollHistory(
    (prev?.metric as IGInsightsMetricPayload | undefined) ?? null,
    (prev?.history as HistoryEntry[] | undefined) ?? []
  );

  // 6) Upsert single insights doc per IG account
  const saved = await InstagramInsights.findOneAndUpdate(
    { instagramAccountId: ig._id },
    {
      instagramAccountId: ig._id,
      metric: metricPayload as any,
      history: newHistory as any,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, select: "_id" }
  ).lean();

  return saved?._id ? String(saved._id) : null;
}
