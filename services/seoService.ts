// services/seoService.ts
import axios from "axios";
// import prisma from "@/lib/prisma";
import { prisma } from '@/lib/prisma';
import { refreshAccessToken } from "@/services/tokenManager";

/**
 * Ensure we always include the right dimensions for dedupe:
 * - date: so each row ties to a specific day
 * - query and page: so uniqueness matches real GSC entities
 * If pageContains filter is used, "page" MUST be a dimension for the filter to work properly.
 */
function normalizeDimensions(inputDims?: string[], pageFilter?: string | null): string[] {
    const base = new Set<string>(Array.isArray(inputDims) && inputDims.length ? inputDims : ["query"]);
    // Guarantee must-have dimensions
    base.add("date");
    base.add("query");
    if (pageFilter) base.add("page"); // required for filter to be valid
    // We also prefer to store per-page rows even without filter
    base.add("page");

    // Stable order helps us map keys deterministically
    const ordered = ["date", "query", "page", "country", "device"].filter((d) => base.has(d));
    return ordered;
}

/**
 * Build request body for Search Console query
 */
function buildRequestBody({
    startDate,
    endDate,
    dimensions = ["query"],
    pageContains,
    rowLimit = 1000,
}: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    pageContains?: string | null;
    rowLimit?: number;
}) {
    const dims = normalizeDimensions(dimensions, pageContains);

    const body: any = {
        startDate,
        endDate,
        dimensions: dims,
        rowLimit,
    };

    if (pageContains) {
        body.dimensionFilterGroups = [
            {
                filters: [
                    {
                        dimension: "page",
                        operator: "contains",
                        expression: pageContains,
                    },
                ],
            },
        ];
    }

    return body;
}
/**
 * Calls Search Console API and returns rows
 */
export async function fetchSearchConsoleData({
    accessToken,
    siteUrl,
    startDate,
    endDate,
    dimensions,
    pageContains,
    rowLimit,
}: {
    accessToken: string;
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions?: string[];
    pageContains?: string | null;
    rowLimit?: number;
}) {
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
    )}/searchAnalytics/query`;


    const body = buildRequestBody({ startDate, endDate, dimensions, pageContains, rowLimit });

    const resp = await axios.post(url, body, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        timeout: 30000,
    });

    if (!resp.data) throw new Error("Empty response from Search Console API");
    return resp.data;
}
/**
 * Parse a Search Console row into our fields using the requested dimensions.
 * GSC returns r.keys[] aligned with the 'dimensions' order from the request.
 */
function parseRowKeys(
    row: any,
    dims: string[]
): { date?: string; query?: string; page?: string; country?: string; device?: string } {
    const out: any = {};
    if (Array.isArray(row?.keys)) {
        row.keys.forEach((val: string, i: number) => {
            const dim = dims[i];
            if (dim) out[dim] = val;
        });
    }
    return out;
}

/**
 * Fetch data from Search Console and store into database.
 */
export async function fetchAndStoreSeoReports({
    userId, // required
    accountId,
    siteUrl,
    startDate,
    endDate,
    pageContains,
    rowLimit = 1000,
    dimensions = ["query"], // caller can pass, we'll normalize to include date/page
}: {
    userId: string;
    accountId?: string | null;
    siteUrl: string;
    startDate: string;
    endDate: string;
    pageContains?: string | null;
    rowLimit?: number;
    dimensions?: string[];
}) {
    if (!userId) throw new Error("Missing userId when fetching SEO reports.");
    if (!siteUrl) throw new Error("Missing siteUrl");

    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    // Step 1: Get account info (tokens)
    if (accountId) {
        const account = await prisma.account.findUnique({
            where: { id: accountId },
            include: { user: true },
        });

        if (!account) throw new Error(`Account not found: ${accountId}`);

        accessToken = account.accessToken ?? undefined;
        refreshToken = account.refreshToken ?? undefined;
    }

    // Step 2: Fallback to env token
    if (!accessToken && process.env.REFRESH_TOKEN && !refreshToken) {
        refreshToken = process.env.REFRESH_TOKEN;
    }

    // Step 3: Refresh access token if needed
    if (!accessToken && refreshToken) {
        try {
            if (accountId) {
                accessToken = await refreshAccessToken(accountId, refreshToken);
            } else {
                const resp = await axios.post(
                    "https://oauth2.googleapis.com/token",
                    new URLSearchParams({
                        client_id: process.env.GOOGLE_CLIENT_ID!,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                        refresh_token: refreshToken,
                        grant_type: "refresh_token",
                    }),
                    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
                );
                accessToken = resp.data.access_token;
            }
        } catch (err: any) {
            console.error("Token refresh failed:", err.response?.data || err.message);
            throw new Error(
                "Failed to refresh access token for Search Console: " + (err?.message || err)
            );
        }
    }
    if (!accessToken) throw new Error("No access token available for Search Console request");

    // Step 4: Fetch data from Search Console
    const scResp: any = await fetchSearchConsoleData({
        accessToken,
        siteUrl,
        startDate,
        endDate,
        dimensions,
        pageContains,
        rowLimit,
    });

    const rows: any[] = scResp.rows ?? [];
    if (!rows.length) {
        console.log("✅ No SEO data returned for this period.");
        return { totalRows: 0, storedCount: 0, stored: [] };
    }

    // Determine the actual dimensions we sent so we can decode keys correctly
    const effectiveDims = normalizeDimensions(dimensions, pageContains);

    // Step 5: Store data into DB with deterministic unique selector
    const stored: any[] = [];

    for (const r of rows) {
        const keys = parseRowKeys(r, effectiveDims);

        const query = (keys.query ?? "").toString();
        const page = (keys.page ?? "").toString();

        // Use the actual row date if present; fall back to endDate (shouldn't happen now)
        const dateKey = keys.date ?? endDate; // keys.date is "YYYY-MM-DD"
        // Save midnight UTC so the same day is identical across fetches
        const date = new Date(`${dateKey}T00:00:00.000Z`);

        const clicks = Number(r.clicks ?? 0);
        const impressions = Number(r.impressions ?? 0);
        const ctr = Number(r.ctr ?? 0);
        const position = Number(r.position ?? 0);

        try {
            const up = await prisma.seoReport.upsert({
                where: {
                    unique_seo_report: {
                        userId,
                        siteUrl,
                        query,
                        page,
                        date,
                        country: "all",
                        device: "all",
                    },
                },
                update: {
                    clicks,
                    impressions,
                    ctr,
                    position,
                },
                create: {
                    userId,
                    siteUrl,
                    query,
                    page,
                    clicks,
                    impressions,
                    ctr,
                    position,
                    date,
                    // country/device default to "all" from schema; include explicitly for clarity
                    country: "all",
                    device: "all",
                },
            });

            stored.push(up);
        } catch (err) {
            // If you have stale duplicates from earlier logic, the unique index will throw.
            // You can ignore/clean them separately (see note below).
            console.error("Failed to store SEO row:", err);
        }
    }

    return { totalRows: rows.length, storedCount: stored.length, stored };
}
/**
 * Query SeoReports from DB (used by UI)
 */
export async function querySeoReports({
    userId,
    siteUrl,
    start,
    end,
    limit = 100,
    page = 0,
}: {
    userId: string;
    siteUrl?: string | null;
    start?: string | null;
    end?: string | null;
    limit?: number;
    page?: number;
}) {
    const where: any = { userId };
    if (siteUrl) where.siteUrl = siteUrl;
    if (start || end) {
        where.date = {};
        if (start) where.date.gte = new Date(`${start}T00:00:00.000Z`);
        if (end) where.date.lte = new Date(`${end}T23:59:59.999Z`);
    }

    const rows = await prisma.seoReport.findMany({
        where,
        orderBy: [{ date: "desc" }, { impressions: "desc" }],
        skip: page * limit,
        take: limit,
    });

    return rows;
}
