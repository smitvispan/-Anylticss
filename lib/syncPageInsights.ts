// lib/syncPageInsights.ts
import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import PageInsights from "@/models/PageInsights";
import { getMetaGraphApiBase } from "@/lib/meta-api";

/** ===== Types ===== */
type FBValuePoint = { value: any; end_time?: string };
type InsightDict = Record<string, FBValuePoint[]>;
type FBInsight = { name: string; period: string; values: FBValuePoint[] };

type InsightsDataShape = {
  lifetime?: InsightDict;
  day?: InsightDict;
  week?: InsightDict;
  days_28?: InsightDict;
};

/** What we store as the current snapshot under `metric` */
type InsightsMetricPayload = {
  insightsData: InsightsDataShape;
  fetchedAt: string; // ISO timestamp when we fetched
  since?: string;    // optional FB API since (ISO date)
  until?: string;    // optional FB API until (ISO date)
};

/** A single history item: the *old* metric snapshot, with when we archived it */
type HistoryEntry = {
  metric: InsightsMetricPayload;
  archivedAt: string; // when we moved it into history
};

const DEFAULT_METRICS = [
  "page_follows",
  // "page_impressions",
  "page_impressions_unique",
  "page_posts_impressions_organic_unique",
  "page_post_engagements",
  "page_video_views",
];
const FALLBACK_METRICS = [
  // "page_impressions",
  "page_impressions_unique",
  "page_post_engagements",
  "page_video_views",
];
const MINIMAL_METRICS = [
  "page_impressions",
  "page_impressions_unique",
  "page_post_engagements",
  "page_engaged_users",
];
const SINGLE_METRIC = ["page_impressions"];

/** Keep at most N history entries (optional safety) */
const MAX_HISTORY_ENTRIES = 30;

/** Transform FB `/insights` array -> { period: { metricName: values[] } } */
function transformInsightsData(list: FBInsight[]): InsightsDataShape {
  const result: InsightsDataShape = {};
  for (const metric of list) {
    const { period, name, values } = metric;
    if (!(result as any)[period]) {
      (result as any)[period] = {};
    }
    (result as any)[period][name] = values;
  }
  return result;
}

/** Build URL with query params */
function buildFBInsightsUrl(
  pageId: string,
  accessToken: string,
  metrics: string[] = DEFAULT_METRICS,
  since?: string,
  until?: string
) {
  const u = new URL(
    `${getMetaGraphApiBase()}/${encodeURIComponent(pageId)}/insights`
  );
  u.searchParams.set("metric", metrics.join(","));
  u.searchParams.set("access_token", accessToken);
  if (since) u.searchParams.set("since", since);
  if (until) u.searchParams.set("until", until);
  return u.toString();
}

/** Fetch insights for one pageId/accessToken (single page call) */
async function fetchInsightsForPage(
  pageId: string,
  accessToken: string,
  since?: string,
  until?: string,
  metrics: string[] = DEFAULT_METRICS
): Promise<FBInsight[]> {
  const metricSets = [metrics];

  for (let i = 0; i < metricSets.length; i++) {
    const set = metricSets[i];
    const url = buildFBInsightsUrl(pageId, accessToken, set, since, until);
    console.log(`Fetching FB insights (try ${i + 1}/${metricSets.length}): ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    console.log(`FB insights response status: ${res.status}`);
    const text = !res.ok ? await res.text() : null;
    console.log(`FB insights response text: ${text ?? "[non-error response]"}`);

    if (!res.ok) {
      const metricError = text?.includes("valid insights metric");
      const isLastAttempt = i === metricSets.length - 1;
      if (metricError && !isLastAttempt) {
        console.warn(
          `FB insights metric error; retrying with next metric set. attempted=${set.join(",")}`
        );
        continue;
      }
      console.warn(
        `FB insights failed${i ? " (fallback)" : ""}: ${res.status} ${text ?? ""}`.trim()
      );
      return [];
    }

    const json = await res.json();
    return (json?.data ?? []) as FBInsight[];
  }

  return [];
}

/** Prepend previous metric to history, cap the array */
function rollHistory(
  prevMetric: InsightsMetricPayload | null | undefined,
  prevHistory: HistoryEntry[] | null | undefined
): HistoryEntry[] {
  const baseHistory = Array.isArray(prevHistory) ? prevHistory : [];
  if (!prevMetric) return baseHistory; // nothing to archive

  const entry: HistoryEntry = {
    metric: prevMetric,
    archivedAt: new Date().toISOString(),
  };

  const next = [entry, ...baseHistory];
  return next.slice(0, MAX_HISTORY_ENTRIES);
}

/**
 * Upsert ONE PageInsights doc for an internal Page (Page.id is internal ObjectId).
 * On each update:
 *  - Move the existing `metric` snapshot to the FRONT of `history`
 *  - Save the new snapshot into `metric`
 * Requires PageInsights.pageId to be UNIQUE in schema.
 */
export async function syncPageInsightsForPage(
  pageInternalId: string,
  opts?: { since?: string; until?: string }
) {
  await connectDB();

  const page = await Page.findById(pageInternalId)
    .select({ _id: 1, name: 1, pageId: 1, accessToken: 1 })
    .lean();
  if (!page) throw new Error(`Page not found: ${pageInternalId}`);
  if (!page.pageId) {
    console.warn(`Missing FB pageId for page: ${page.name ?? page._id}`);
    return null;
  }
  if (!page.accessToken) {
    console.warn(`Missing access token for page: ${page.name ?? page._id}`);
    return null;
  }

  // Get previous snapshot (if any) to roll into history
  const prev = await PageInsights.findOne({ pageId: page._id })
    .select({ metric: 1, history: 1 })
    .lean();

  // Fetch from FB
  const fbList = await fetchInsightsForPage(
    page.pageId || "",
    page.accessToken,
    opts?.since,
    opts?.until
  );
  if (!fbList.length) {
    console.warn(`No insights returned for page: ${page.name ?? page._id}`);
  }

  // Build new metric snapshot
  const insightsData = transformInsightsData(fbList);
  const metricPayload: InsightsMetricPayload = {
    insightsData,
    fetchedAt: new Date().toISOString(),
    since: opts?.since,
    until: opts?.until,
  };

  // Compute next history by archiving the previous metric (if present)
  const newHistory = rollHistory(
    (prev?.metric as InsightsMetricPayload | undefined) ?? null,
    (prev?.history as HistoryEntry[] | undefined) ?? []
  );

  // Upsert single insights doc per page
  const saved = await PageInsights.findOneAndUpdate(
    { pageId: page._id },
    {
      pageId: page._id,
      metric: metricPayload as any,
      history: newHistory as any,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, select: "_id" }
  ).lean();

  return saved?._id ? String(saved._id) : null;
}

/** Sync insights for ALL pages that have accessToken. */
export async function syncPageInsightsForAllPages(opts?: { since?: string; until?: string }) {
  await connectDB();

  const pages = await Page.find({ accessToken: { $ne: null } })
    .select({ _id: 1, name: 1, pageId: 1, accessToken: 1 })
    .lean();

  const result: Record<string, { ok: boolean; id?: string; error?: string }> = {};
  for (const p of pages) {
    const pageId = String(p._id);
    if (!p.accessToken || !p.pageId) {
      result[pageId] = { ok: false, error: "missing_token" };
      continue;
    }
    try {
      const id = await syncPageInsightsForPage(pageId, opts);
      result[pageId] = { ok: true, id: id ?? undefined };
    } catch (e: any) {
      console.error(`❌ Error syncing insights for ${p.name ?? pageId}:`, e?.message || e);
      result[pageId] = { ok: false, error: e?.message || "error" };
    }
  }
  return result;
}
