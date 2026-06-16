import { TrendingDown, TrendingUp, Users, Heart, MessageCircle, Eye, Share2, Link as LinkIcon, BarChart3, UserPlus, Image as ImageIcon, Target, MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { notFound } from "next/navigation";
import { syncInstagramForUser } from "@/lib/syncInstagramAccount";
import { getPreviousPeriod } from "@/lib/dateRanges";
import { syncInstagramInsightsForAccount } from "@/lib/syncinstagramInsights";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import InstagramAccount from "@/models/InstagramAccount";
import InstagramInsights from "@/models/InstagramInsights";
import MetricSparkline from "../page/_components/MetricSparkline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidObjectId(str: string) {
  return /^[a-fA-F0-9]{24}$/.test(str);
}

type InsightPoint = { value: any; end_time?: string };
type InsightBucket = Record<string, number | InsightPoint[]>;
type InsightsMetricPayload = {
  insightsData: any;
  fetchedAt: string;
  since?: string;
  until?: string;
};
type HistoryEntry = {
  metric: InsightsMetricPayload;
  archivedAt: string;
};

function getSnapshotForRange(
  insights: { metric?: any; history?: any } | null | undefined,
  startDate: string,
  endDate: string
): { snapshot?: InsightsMetricPayload; source: "current" | "history" | null; historyIndex?: number } {
  if (!insights) return { source: null };

  const metric = (insights.metric ?? {}) as InsightsMetricPayload;
  if (metric?.since === startDate && metric?.until === endDate) {
    return { snapshot: metric, source: "current" };
  }

  const history = Array.isArray(insights.history) ? (insights.history as HistoryEntry[]) : [];
  const idx = history.findIndex(
    (h) => h?.metric?.since === startDate && h?.metric?.until === endDate
  );
  if (idx !== -1) {
    return { snapshot: history[idx].metric, source: "history", historyIndex: idx };
  }

  return { source: null };
}

function asNumber(input: number | InsightPoint[] | undefined): number {
  if (typeof input === "number") return input;
  if (Array.isArray(input) && input.length) {
    const last = input[input.length - 1];
    return typeof last?.value === "number" ? last.value : Number(last?.value) || 0;
  }
  return 0;
}

function seriesFromInsight(input: number | InsightPoint[] | undefined): number[] {
  if (typeof input === "number") return [input];
  if (Array.isArray(input)) {
    return input.map((p) => (typeof p?.value === "number" ? p.value : Number(p?.value) || 0));
  }
  return [];
}

function totalFromSeries(series: number[]): number {
  return series.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
}

function getPrevMonthRange(): { start: string; end: string } {
  const today = new Date();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);

  const toISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return { start: toISODate(firstOfPrevMonth), end: toISODate(lastOfPrevMonth) };
}

type SearchParams = {
  start?: string;
  end?: string;
  campaign?: string;
  adset?: string;
};

const IG_DAY_KPIS = [
  { key: "accounts_engaged", title: "Accounts Engaged", icon: Users, color: "#6366f1" },
  { key: "likes", title: "Likes", icon: Heart, color: "#ec4899" },
  { key: "comments", title: "Comments", icon: MessageCircle, color: "#06b6d4" },
  { key: "reach", title: "Reach", icon: Eye, color: "#10b981" },
  { key: "shares", title: "Shares", icon: Share2, color: "#f59e0b" },
  { key: "views", title: "Views", icon: Eye, color: "#8b5cf6" },
  { key: "profile_links_taps", title: "Link Clicks", icon: LinkIcon, color: "#3b82f6" },
  // { key: "follows_and_unfollows", title: "Follows", icon: Users, color: "#84cc16" },
];

export default async function AnalyticsPublicDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  const logCtx = `[IGInsights][user:${id}]`;

  const user = await User.findById(id).select({ _id: 1, mainPage: 1 }).lean();
  if (!user) notFound();

  let igAccount = await InstagramAccount.findOne({ userId: id }).lean();

  if (!igAccount) {
    try {
      await syncInstagramForUser(id);
      igAccount = await InstagramAccount.findOne({ userId: id }).sort({ _id: 1 }).lean();
    } catch (e) {
      console.error("Sync pages failed:", e);
    }
  }
  
  if (!igAccount) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SiteBreadcrumb />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            No Instagram Account Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This user doesn't have an Instagram account connected yet.
          </p>
        </div>
      </div>
    </div>
  );

  const defaults = getPrevMonthRange();
  const startDate = sp.start || defaults.start;
  const endDate = sp.end || defaults.end;
  const { start, end } = getPreviousPeriod(startDate, endDate);

  const logRange = `${logCtx} Checking insights for range ${startDate} → ${endDate}`;
  console.log(logRange);
  const igAccountId = String(igAccount._id);

  let insights = await InstagramInsights.findOne({ instagramAccountId: igAccountId }).lean();
  let syncedCurrentRange = false;
  let syncedCompareRange = false;
  let syncedEmptyDoc = false;

  if (!insights) {
    try {    
      await syncInstagramInsightsForAccount(igAccountId, { since: start, until: end });
      await syncInstagramInsightsForAccount(igAccountId, { since: startDate, until: endDate });
      insights = await InstagramInsights.findOne({ instagramAccountId: igAccountId }).lean();
      syncedEmptyDoc = true;
    } catch (e) {
      console.error("Sync insights failed:", e);
    }
  }

  var { snapshot, source } = getSnapshotForRange(insights, startDate, endDate);
  let snapshot1 = snapshot;
  let source1 = source;

  if (!snapshot1) {
    try {
      await syncInstagramInsightsForAccount(igAccountId, { since: startDate, until: endDate });
      insights = await InstagramInsights.findOne({ instagramAccountId: igAccountId }).lean();
      const secondTry = getSnapshotForRange(insights, startDate, endDate);
      snapshot1 = secondTry.snapshot;
      source1 = secondTry.source;
      syncedCurrentRange = true;
    } catch (e) {
      console.error("Sync insights (second attempt) failed:", e);
    }
  }

  const metric = (snapshot1 ?? { insightsData: {} }) as InsightsMetricPayload;
  const insightsData = (metric.insightsData ?? {}) as {
    lifetime?: InsightBucket;
    day?: InsightBucket;
    week?: InsightBucket;
    days_28?: InsightBucket;
  };

  var { snapshot, source } = getSnapshotForRange(insights, start, end);
  let snapshot2 = snapshot;
  let source2 = source;

  if (!snapshot2) {
    try {
      await syncInstagramInsightsForAccount(igAccountId, { since: start, until: end });
      insights = await InstagramInsights.findOne({ instagramAccountId: igAccountId }).lean();
      const secondTry = getSnapshotForRange(insights, start, end);
      snapshot2 = secondTry.snapshot;
      source2 = secondTry.source;
      syncedCompareRange = true;
    } catch (e) {
      console.error("Sync insights (second attempt) failed:", e);
    }
  }

  const metric_compare = (snapshot2 ?? { insightsData: {} }) as InsightsMetricPayload;
  const insightsData_compare = (metric_compare.insightsData ?? {}) as {
    lifetime?: InsightBucket;
    day?: InsightBucket;
    week?: InsightBucket;
    days_28?: InsightBucket;
  };

  const syncedSomething = syncedEmptyDoc || syncedCurrentRange || syncedCompareRange;

  function calcPctChange(currTotal: number, prevTotal: number): number | null {
    if (prevTotal === 0) return null;
    return ((currTotal - prevTotal) / prevTotal) * 100;
  }

  function formatPct(pct: number | null): string {
    if (pct === null || Number.isNaN(pct)) return "—";
    const sign = pct > 0 ? "+" : "";
    return `${sign}${Math.abs(pct).toFixed(1)}%`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Instagram Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed insights and performance metrics for your Instagram account
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">
                {syncedSomething ? "Data refreshed" : "Live data"}
              </span>
            </div>
          </div>
        </div>

        {/* Account Overview Card */}
        <Card className="mb-10 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="w-full">
                <div className="flex flex-col space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {igAccount.name}
                    </h2>
                    <div className="flex items-center gap-2 mb-3">
                      <a 
                        href={`https://instagram.com/${igAccount.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-2"
                      >
                        @{igAccount.username}
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 3h7a1 1 0 011 1v7h-2V5h-6V3z"/>
                          <path d="M21 21H3a1 1 0 01-1-1V3a1 1 0 011-1h7v2H5v14h14v-6h2v7a1 1 0 01-1 1z"/>
                        </svg>
                      </a>
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                        </svg>
                        Instagram
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {igAccount.followers_count?.toLocaleString() || "0"}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            followers
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                          <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {igAccount.media_count?.toLocaleString() || "0"}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            posts
                          </div>
                        </div>
                      </div>
                      
                      {igAccount.follows_count && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {igAccount.follows_count?.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              following
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {igAccount.biography && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="max-w-[200px]">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {igAccount.biography}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              bio
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Stats Cards */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Account Statistics
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-gray-800 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {igAccount.followers_count?.toLocaleString() || "0"}
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Total Followers
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Number of people following the account
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Audience Trend
                      </span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        Primary Metric
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/10 dark:to-gray-800 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                        <UserPlus className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {igAccount.follows_count?.toLocaleString() || "0"}
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Following
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Number of accounts this profile follows
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Engagement Ratio
                      </span>
                      <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                        Network Size
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-gray-800 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                        <ImageIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {igAccount.media_count?.toLocaleString() || "0"}
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Total Posts
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        All posts, stories, and reels published
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Content Volume
                      </span>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Active Account
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-gray-800 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                        <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {asNumber(insightsData?.day?.reach)?.toLocaleString() || "0"}
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Current Reach
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Unique accounts that saw your content
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Audience Trend
                      </span>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Performance
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Daily Performance Metrics */}
        {insights ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Daily Performance Metrics
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Key metrics for the selected date range compared to previous period
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {IG_DAY_KPIS.map((cfg) => {
                const Icon = cfg.icon;
                const bucketData = (insightsData?.day ?? {}) as InsightBucket;
                const compareBucket = (insightsData_compare?.day ?? {}) as InsightBucket;
                
                const currentSeries = seriesFromInsight(bucketData[cfg.key]);
                const prevSeries = seriesFromInsight(compareBucket[cfg.key]);
                const currTotal = totalFromSeries(currentSeries);
                const prevTotal = totalFromSeries(prevSeries);

                const pct = calcPctChange(currTotal, prevTotal);
                const pctText = formatPct(pct);
                
                const isPositive = pct !== null && pct > 0;
                const isNegative = pct !== null && pct < 0;
                const hasChange = pct !== null && !isNaN(pct as any);

                return (
                  <Card 
                    key={cfg.key} 
                    className="group border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 shadow-sm">
                          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                        </div>
                        {hasChange && (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            isPositive 
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : isNegative 
                              ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {isPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : isNegative ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {pctText}
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {typeof currTotal === 'number' ? currTotal.toLocaleString() : currTotal}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {cfg.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Compared to previous period
                        </p>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Previous
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {typeof prevTotal === 'number' ? prevTotal.toLocaleString() : prevTotal}
                          </span>
                        </div>
                      </div>

                      <MetricSparkline
                        values={currentSeries}
                        color={cfg.color}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* Loading State */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
