// app/api/instagram/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type InsightValue = {
  end_time?: string;
  value: number | Record<string, unknown>;
};

type AccountInsightMetric = {
  name: string;
  period: string; // "day", etc.
  total_value?: { value: number } | null; // from account insights with metric_type=total_value
  values?: InsightValue[]; // fallback for some metrics
};

type Post = {
  id: string;
  caption?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  like_count?: number | null;
  comments_count?: number | null;
};

function transformInsightsDataIG(insightsData: AccountInsightMetric[]) {
  const result: Record<string, Record<string, unknown>> = {};
  for (const metric of insightsData) {
    const period = metric.period;
    const name = metric.name;
    const value =
      metric.total_value?.value ??
      (Array.isArray(metric.values) ? metric.values : null);

    if (!result[period]) result[period] = {};
    result[period][name] = value;
  }
  return result;
}

function transformPostInsightsData(
  insightsData: Array<{ name: string; period: string; values: InsightValue[] }>
) {
  const result: Record<string, Record<string, InsightValue[]>> = {};
  for (const metric of insightsData) {
    const { period, name, values } = metric;
    if (!result[period]) result[period] = {};
    result[period][name] = values || [];
  }
  return result;
}

async function fetchJSON<T>(url: string, params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  const res = await fetch(`${url}?${usp.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

async function fetchAccountInsights(igId: string, accessToken: string) {
  const url = `https://graph.facebook.com/v19.0/${igId}/insights`;
  const data = await fetchJSON<{ data: AccountInsightMetric[] }>(url, {
    access_token: accessToken,
    metric:
      "accounts_engaged,comments,follows_and_unfollows,likes,profile_links_taps,reach,replies,shares,views",
    period: "day",
    metric_type: "total_value",
  });
  return transformInsightsDataIG(data.data);
}

async function fetchPostPage(
  igId: string,
  accessToken: string,
  after?: string
) {
  type MediaResp = {
    data: Post[];
    paging?: { next?: string; cursors?: { after?: string } };
  };

  const base = `https://graph.facebook.com/v19.0/${igId}/media`;
  const params: Record<string, string> = {
    access_token: accessToken,
    fields:
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
    limit: "50",
  };
  if (after) params.after = after;

  const page = await fetchJSON<MediaResp>(base, params);
  const nextAfter = page?.paging?.cursors?.after;
  return { posts: page.data || [], nextAfter, hasNext: Boolean(page.paging?.next) };
}

async function fetchPostInsights(postId: string, accessToken: string) {
  type InsightsResp = {
    data: Array<{ name: string; period: string; values: InsightValue[] }>;
  };
  const url = `https://graph.facebook.com/v19.0/${postId}/insights`;
  const data = await fetchJSON<InsightsResp>(url, {
    access_token: accessToken,
    metric: "comments,likes,reach,shares,views,total_interactions",
  });
  return transformPostInsightsData(data.data);
}

export async function GET() {
  const startedAt = Date.now();

  try {
    // Pull all IG accounts that have tokens + igId
    const accounts = await prisma.instagramAccount.findMany({
      where: {
        igId: { not: null as any },
        pageAccessToken: { not: null as any },
      },
      select: {
        id: true,
        igId: true,
        pageAccessToken: true,
      },
    });

    const summary: Array<{
      instagramAccountId: string;
      igId: string;
      insightsSaved: boolean;
      postsUpserted: number;
    }> = [];

    for (const acc of accounts) {
      if (!acc.igId || !acc.pageAccessToken) continue;

      // 1) Account-level insights
      const metric = await fetchAccountInsights(acc.igId, acc.pageAccessToken);
      const metricJson = JSON.parse(JSON.stringify(metric));

      // Upsert into InstagramInsights (unique on instagramAccountId)
      await prisma.instagramInsights.upsert({
        where: { instagramAccountId: acc.id },
        create: {
          instagramAccountId: acc.id,
          metric: metricJson,
          history: [],
        },
        update: {
          metric: metricJson,
          // append to history if you want; here we keep it simple
        },
      });

      // 2) Posts + per-post insights (paginate)
      let postsUpserted = 0;
      let after: string | undefined = undefined;

      do {
        const { posts, nextAfter, hasNext } = await fetchPostPage(
          acc.igId,
          acc.pageAccessToken,
          after
        );

        for (const p of posts) {
          // Fetch per-post insights
          const postMetric = await fetchPostInsights(p.id, acc.pageAccessToken);
          const postMetricJson = JSON.parse(JSON.stringify(postMetric));

          // Find existing by (instagramAccountId + postid)
          const existing = await prisma.instagramPost.findFirst({
            where: {
              instagramAccountId: acc.id,
              postid: p.id,
            },
            select: { id: true },
          });

          if (existing) {
            await prisma.instagramPost.update({
              where: { id: existing.id },
              data: {
                metric: postMetricJson,
                permalink_url: p.permalink ?? null,
                created_time: p.timestamp ?? null,
                full_picture: p.media_url ?? p.thumbnail_url ?? null,
                history: [], // keep if needed
              },
            });
          } else {
            await prisma.instagramPost.create({
              data: {
                instagramAccountId: acc.id,
                postid: p.id,
                metric: postMetricJson,
                permalink_url: p.permalink ?? null,
                created_time: p.timestamp ?? null,
                full_picture: p.media_url ?? p.thumbnail_url ?? null,
                history: [],
              },
            });
          }

          postsUpserted++;
        }

        after = nextAfter;
        // Optional small delay to be gentle with API rate limits
        // await new Promise(r => setTimeout(r, 80));
        if (!hasNext) break;
      } while (true);

      summary.push({
        instagramAccountId: acc.id,
        igId: acc.igId,
        insightsSaved: true,
        postsUpserted,
      });
    }

    const ms = Date.now() - startedAt;
    return NextResponse.json({ ok: true, tookMs: ms, accounts: summary });
  } catch (err: any) {
    console.error("❌ /api/instagram/sync error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
