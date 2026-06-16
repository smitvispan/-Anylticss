"use client";

import React, { useEffect, useMemo, useState } from "react";

type SeoRow = {
    id: string;
    siteUrl: string;
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number; // 0..1
    position: number;
    date: string; // ISO
    createdAt?: string;
};

type Metrics = {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
    uniqueKeywords: number;
    uniquePages: number;
};

const DEFAULT_TARGET_KEYWORDS: string[] = [
    "access 125 accessories",
    "honda activa accessories",
    "activa accessories",
    "suzuki access 125 accessories",
    "activa 125 accessories",
    "hero destini 125 accessories",
    "tvs jupiter accessories",
    "burgman accessories",
    "bajaj chetak accessories",
    "activa 4g accessories",
];

/** ---------- aggregation helpers ---------- */
function aggregateRowsByQuery(data: SeoRow[], fallbackEnd?: string): SeoRow[] {
    if (!data?.length) return [];

    type Agg = {
        siteUrl: string;
        clicks: number;
        impressions: number;
        posImprSum: number;
        pageImprMap: Map<string, number>;
    };

    const map = new Map<string, Agg>();

    for (const r of data) {
        const key = r.query.trim().toLowerCase();
        const prev = map.get(key);
        const pageKey = r.page || "—";
        if (!prev) {
            const m: Agg = {
                siteUrl: r.siteUrl,
                clicks: r.clicks || 0,
                impressions: r.impressions || 0,
                posImprSum: (r.position || 0) * (r.impressions || 0),
                pageImprMap: new Map([[pageKey, r.impressions || 0]]),
            };
            map.set(key, m);
        } else {
            prev.clicks += r.clicks || 0;
            prev.impressions += r.impressions || 0;
            prev.posImprSum += (r.position || 0) * (r.impressions || 0);
            prev.pageImprMap.set(
                pageKey,
                (prev.pageImprMap.get(pageKey) || 0) + (r.impressions || 0)
            );
        }
    }

    const endIso = fallbackEnd
        ? new Date(`${fallbackEnd}T00:00:00.000Z`).toISOString()
        : new Date().toISOString();

    const aggregated: SeoRow[] = [];
    for (const [qKey, agg] of map.entries()) {
        let bestPage = "—";
        let bestImpr = -1;
        for (const [p, impr] of agg.pageImprMap.entries()) {
            if (impr > bestImpr) {
                bestImpr = impr;
                bestPage = p;
            }
        }

        const totalImpr = Math.max(agg.impressions, 0);
        const totalClicks = Math.max(agg.clicks, 0);
        const ctr = totalImpr > 0 ? totalClicks / totalImpr : 0;
        const position = totalImpr > 0 ? agg.posImprSum / totalImpr : 0;

        aggregated.push({
            id: `agg-${qKey}`,
            siteUrl: agg.siteUrl,
            query: qKey,
            page: bestPage,
            clicks: totalClicks,
            impressions: totalImpr,
            ctr,
            position,
            date: endIso,
        });
    }

    aggregated.sort((a, b) => b.impressions - a.impressions);
    return aggregated;
}

export default function SeoReportTable({
    siteUrl,
    userId,
    start,
    end,
    pageContains,
    gscSiteId,
}: {
    siteUrl?: string;
    userId?: string;
    start?: string;
    end?: string;
    pageContains?: string;
    gscSiteId?: string;
}) {
    const [rows, setRows] = useState<SeoRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Main table pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // Priority keywords states
    const [kwCurrentPage, setKwCurrentPage] = useState(1);
    const [kwRowsPerPage, setKwRowsPerPage] = useState(10);
    const [savedKeywords, setSavedKeywords] = useState<string[] | null>(null);
    const [kwInput, setKwInput] = useState("");

    const [isKeywordsCollapsed, setIsKeywordsCollapsed] = useState(false);

    async function loadSeoRows() {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set("limit", "500");
            params.set("page", "0");
            if (siteUrl) params.set("siteUrl", siteUrl);
            if (start) params.set("start", start);
            if (end) params.set("end", end);
            if (pageContains) params.set("pageContains", pageContains);
            if (gscSiteId) params.set("gscSiteId", gscSiteId); // NEW

            const res = await fetch(`/api/seo?${params.toString()}`, {
                method: "GET",
                credentials: "include",
            });
            const json = await res.json();

            if (!json.ok) {
                setError(json.error || "Failed to load reports");
            } else {
                setRows(Array.isArray(json.rows) ? json.rows : []);
                setCurrentPage(1);
                setKwCurrentPage(1);
            }
        } catch (err: any) {
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    async function loadSavedKeywords() {
        try {
            const params = new URLSearchParams();
            if (siteUrl) params.set("siteUrl", siteUrl);
            if (gscSiteId) params.set("gscSiteId", gscSiteId); // if your priority API supports it

            const res = await fetch(
                `/api/seo/priority-keywords?${params.toString()}`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );
            const json = await res.json();
            if (json?.ok) {
                setSavedKeywords(Array.isArray(json.keywords) ? json.keywords : []);
            } else {
                setSavedKeywords([]);
            }
        } catch {
            setSavedKeywords([]);
        }
    }

    useEffect(() => {
        loadSeoRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteUrl, userId, start, end, pageContains, gscSiteId]);

    useEffect(() => {
        loadSavedKeywords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteUrl, gscSiteId]);

    const getPositionColor = (position: number) => {
        if (position <= 3) return "text-green-600 bg-green-50";
        if (position <= 10) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
    };

    const getCtrColor = (ctr: number) => {
        if (ctr > 0.1) return "text-green-600 bg-green-50";
        if (ctr > 0.05) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
    };

    const computeMetrics = (data: SeoRow[]): Metrics => {
        if (!data.length) {
            return {
                totalClicks: 0,
                totalImpressions: 0,
                averageCtr: 0,
                averagePosition: 0,
                uniqueKeywords: 0,
                uniquePages: 0,
            };
        }
        const totalClicks = data.reduce((s, r) => s + r.clicks, 0);
        const totalImpressions = data.reduce((s, r) => s + r.impressions, 0);
        const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        const posImprSum = data.reduce(
            (s, r) => s + r.position * r.impressions,
            0
        );
        const averagePosition =
            totalImpressions > 0 ? posImprSum / totalImpressions : 0;
        const uniqueKeywords = new Set(
            data.map((r) => r.query.toLowerCase().trim())
        ).size;
        const uniquePages = new Set(data.map((r) => r.page)).size;

        return {
            totalClicks,
            totalImpressions,
            averageCtr,
            averagePosition,
            uniqueKeywords,
            uniquePages,
        };
    };

    const aggregatedRows = useMemo(
        () => aggregateRowsByQuery(rows, end),
        [rows, end]
    );

    const metrics: Metrics = useMemo(
        () => computeMetrics(aggregatedRows),
        [aggregatedRows]
    );

    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return aggregatedRows.slice(startIndex, startIndex + rowsPerPage);
    }, [aggregatedRows, currentPage, rowsPerPage]);

    const totalPages =
        Math.ceil(aggregatedRows.length / rowsPerPage) || 1;

    const activeKeywordList: string[] = useMemo(() => {
        if (savedKeywords && savedKeywords.length > 0) return savedKeywords;
        if (savedKeywords && savedKeywords.length === 0)
            return DEFAULT_TARGET_KEYWORDS;
        return DEFAULT_TARGET_KEYWORDS;
    }, [savedKeywords]);

    const aggByQuery = useMemo(() => {
        const m = new Map<string, SeoRow>();
        for (const r of aggregatedRows) {
            m.set(r.query.toLowerCase().trim(), r);
        }
        return m;
    }, [aggregatedRows]);

    const kwRowsWithPlaceholders: SeoRow[] = useMemo(() => {
        const list: SeoRow[] = [];
        const nowIso = new Date().toISOString();

        activeKeywordList.forEach((kw, idx) => {
            const key = kw.toLowerCase().trim();
            const found = aggByQuery.get(key);
            if (found) {
                list.push({ ...found, id: `kw-agg-${idx}`, query: kw });
            } else {
                list.push({
                    id: `kw-placeholder-${idx}`,
                    siteUrl: aggregatedRows[0]?.siteUrl || (siteUrl || ""),
                    query: kw,
                    page: "—",
                    clicks: 0,
                    impressions: 0,
                    ctr: 0,
                    position: 0,
                    date: end
                        ? new Date(`${end}T00:00:00.000Z`).toISOString()
                        : nowIso,
                });
            }
        });

        return list;
    }, [activeKeywordList, aggByQuery, aggregatedRows, end, siteUrl]);

    const kwMetrics: Metrics = useMemo(
        () => computeMetrics(kwRowsWithPlaceholders),
        [kwRowsWithPlaceholders]
    );

    const kwTotalPages =
        Math.ceil(kwRowsWithPlaceholders.length / kwRowsPerPage) || 1;
    const kwPaginatedRows = useMemo(() => {
        const startIndex = (kwCurrentPage - 1) * kwRowsPerPage;
        return kwRowsWithPlaceholders.slice(
            startIndex,
            startIndex + kwRowsPerPage
        );
    }, [kwRowsWithPlaceholders, kwCurrentPage, kwRowsPerPage]);

    const handleSaveKeywords = async () => {
        const payload = {
            siteUrl: siteUrl || undefined,
            keywords: kwInput,
            gscSiteId, // if your priority API needs to scope by this id
        };
        const res = await fetch("/api/seo/priority-keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json?.ok) {
            alert(json?.error || "Failed to save priority keywords");
            return;
        }
        setKwInput("");
        setSavedKeywords(Array.isArray(json.keywords) ? json.keywords : []);
        setKwCurrentPage(1);
    };

    const handleDeleteKeyword = async (keyword: string) => {
        const res = await fetch("/api/seo/priority-keywords", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ siteUrl: siteUrl || undefined, keyword, gscSiteId }),
        });
        const json = await res.json();
        if (!json?.ok) {
            alert(json?.error || "Failed to delete keyword");
            return;
        }
        setSavedKeywords(Array.isArray(json.keywords) ? json.keywords : []);
        setKwCurrentPage(1);
    };

    return (
        <div className="w-full space-y-6 lg:space-y-10">
            {/* MAIN SECTION */}
            <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                            SEO Performance Report
                        </h3>
                        <div className="mt-1 text-sm text-gray-500">
                            {aggregatedRows.length} keywords •{" "}
                            {start && end ? `${start} to ${end}` : "All time"}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <MetricCard
                        title="Total Clicks"
                        value={metrics.totalClicks.toLocaleString()}
                        trend=""
                        color="blue"
                    />
                    <MetricCard
                        title="Impressions"
                        value={metrics.totalImpressions.toLocaleString()}
                        trend=""
                        color="purple"
                    />
                    <MetricCard
                        title="Avg. CTR"
                        value={`${(metrics.averageCtr * 100).toFixed(2)}%`}
                        trend=""
                        color="green"
                    />
                    <MetricCard
                        title="Avg. Position"
                        value={metrics.averagePosition.toFixed(1)}
                        trend=""
                        color="orange"
                    />
                    <MetricCard
                        title="Unique Keywords"
                        value={metrics.uniqueKeywords.toLocaleString()}
                        trend=""
                        color="indigo"
                    />
                    <MetricCard
                        title="Unique Pages"
                        value={metrics.uniquePages.toLocaleString()}
                        trend=""
                        color="pink"
                    />
                </div>

                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading && (
                        <div className="flex items-center justify-center p-6 sm:p-8">
                            <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-blue-600" />
                        </div>
                    )}

                    {error && (
                        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg m-3 sm:m-4">
                            <div className="text-red-800 font-medium text-sm sm:text-base">
                                Error loading data
                            </div>
                            <div className="text-red-600 text-xs sm:text-sm mt-1">{error}</div>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <table className="w-full min-w-[640px] sm:min-w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <Th className="hidden sm:table-cell">Search Query</Th>
                                        <Th className="sm:hidden">Query</Th>
                                        <Th className="hidden md:table-cell">Top Page (by Impr.)</Th>
                                        <Th className="md:hidden">Top Page</Th>
                                        <ThRight className="whitespace-nowrap">Clicks</ThRight>
                                        <ThRight className="hidden sm:table-cell whitespace-nowrap">Impressions</ThRight>
                                        <ThRight className="sm:hidden whitespace-nowrap">Impr.</ThRight>
                                        <ThRight className="whitespace-nowrap">CTR</ThRight>
                                        <ThRight className="whitespace-nowrap">Position</ThRight>
                                        <Th className="hidden md:table-cell">Date</Th>
                                        <Th className="md:hidden">Date</Th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500"
                                            >
                                                <div className="flex flex-col items-center">
                                                    <svg
                                                        className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-2"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                    </svg>
                                                    <span className="text-sm sm:text-base">
                                                        No data available for the selected criteria
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-gray-50 transition-colors duration-150"
                                            >
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm font-medium text-gray-900 max-w-[120px] sm:max-w-xs truncate">
                                                        {row.query}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="text-xs sm:text-sm text-gray-600 max-w-[100px] md:max-w-md truncate">
                                                        {row.page}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                    <span className="text-xs sm:text-sm font-semibold text-blue-600">
                                                        {row.clicks.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                    <span className="text-xs sm:text-sm font-semibold text-purple-600">
                                                        {row.impressions.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                    <span
                                                        className={`text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getCtrColor(
                                                            row.ctr
                                                        )}`}
                                                    >
                                                        {(row.ctr * 100).toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                    <span
                                                        className={`text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getPositionColor(
                                                            row.position
                                                        )}`}
                                                    >
                                                        {row.position.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                                    <span className="hidden md:inline">
                                                        {new Date(row.date).toLocaleDateString("en-US", {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </span>
                                                    <span className="md:hidden">
                                                        {new Date(row.date).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {aggregatedRows.length > 0 && (
                    <PaginationBar
                        from={(currentPage - 1) * rowsPerPage + 1}
                        to={Math.min(
                            currentPage * rowsPerPage,
                            aggregatedRows.length
                        )}
                        total={aggregatedRows.length}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPrev={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        onNext={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        onJump={(page) => setCurrentPage(page)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(v) => {
                            setRowsPerPage(v);
                            setCurrentPage(1);
                        }}
                        isMobile={true}
                    />
                )}
            </div>

            {/* PRIORITY KEYWORDS SECTION */}
            <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center flex-wrap gap-2">
                            <button
                                onClick={() =>
                                    setIsKeywordsCollapsed(!isKeywordsCollapsed)
                                }
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label={
                                    isKeywordsCollapsed ? "Expand section" : "Collapse section"
                                }
                            >
                                <svg
                                    className={`w-5 h-5 text-gray-600 transform transition-transform ${isKeywordsCollapsed ? "-rotate-90" : ""
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Most Valuable Keywords
                            </h3>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <input
                                type="text"
                                value={kwInput}
                                onChange={(e) => setKwInput(e.target.value)}
                                placeholder="Enter keywords, comma-separated..."
                                className="w-full sm:w-64 md:w-80 lg:w-[420px] px-3 sm:px-4 py-2 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            />
                            <button
                                onClick={handleSaveKeywords}
                                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                                title="Save as your Priority Keywords"
                            >
                                Show Data
                            </button>
                        </div>
                    </div>
                    
                    <div className="text-xs sm:text-sm text-gray-500 mt-2 md:mt-0">
                        {kwRowsWithPlaceholders.length} rows •{" "}
                        {start && end ? `${start} to ${end}` : "All time"}
                    </div>
                </div>

                {!isKeywordsCollapsed && (
                    <>
                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {loading && (
                                <div className="flex items-center justify-center p-6 sm:p-8">
                                    <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-blue-600" />
                                </div>
                            )}

                            {error && (
                                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg m-3 sm:m-4">
                                    <div className="text-red-800 font-medium text-sm sm:text-base">
                                        Error loading data
                                    </div>
                                    <div className="text-red-600 text-xs sm:text-sm mt-1">{error}</div>
                                </div>
                            )}

                            {!loading && !error && (
                                <div className="overflow-x-auto -mx-2 sm:mx-0">
                                    <table className="w-full min-w-[800px] sm:min-w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <Th className="hidden sm:table-cell">Search Query (your 10)</Th>
                                                <Th className="sm:hidden">Keyword</Th>
                                                <Th className="hidden md:table-cell">Top Page (by Impr.)</Th>
                                                <Th className="md:hidden">Top Page</Th>
                                                <ThRight className="whitespace-nowrap">Clicks</ThRight>
                                                <ThRight className="hidden sm:table-cell whitespace-nowrap">Impressions</ThRight>
                                                <ThRight className="sm:hidden whitespace-nowrap">Impr.</ThRight>
                                                <ThRight className="whitespace-nowrap">CTR</ThRight>
                                                <ThRight className="whitespace-nowrap">Position</ThRight>
                                                <Th className="hidden md:table-cell">Date</Th>
                                                <Th className="md:hidden">Date</Th>
                                                <ThRight className="whitespace-nowrap">Action</ThRight>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {kwPaginatedRows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500"
                                                    >
                                                        No keyword data found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                kwPaginatedRows.map((row) => (
                                                    <tr
                                                        key={row.id}
                                                        className="hover:bg-gray-50 transition-colors duration-150"
                                                    >
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                            <div className="text-xs sm:text-sm font-medium text-gray-900 max-w-[120px] sm:max-w-xs truncate">
                                                                {row.query}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                            <div className="text-xs sm:text-sm text-gray-600 max-w-[100px] md:max-w-md truncate">
                                                                {row.page}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                            <span className="text-xs sm:text-sm font-semibold text-blue-600">
                                                                {row.clicks.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                            <span className="text-xs sm:text-sm font-semibold text-purple-600">
                                                                {row.impressions.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                            <span
                                                                className={`text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getCtrColor(
                                                                    row.ctr
                                                                )}`}
                                                            >
                                                                {(row.ctr * 100).toFixed(2)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                            <span
                                                                className={`text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getPositionColor(
                                                                    row.position
                                                                )}`}
                                                            >
                                                                {row.position.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                                            <span className="hidden md:inline">
                                                                {new Date(row.date).toLocaleDateString(
                                                                    "en-US",
                                                                    {
                                                                        year: "numeric",
                                                                        month: "short",
                                                                        day: "numeric",
                                                                    }
                                                                )}
                                                            </span>
                                                            <span className="md:hidden">
                                                                {new Date(row.date).toLocaleDateString(
                                                                    "en-US",
                                                                    {
                                                                        month: "short",
                                                                        day: "numeric",
                                                                    }
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteKeyword(row.query)
                                                                }
                                                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 whitespace-nowrap"
                                                                title="Remove from Priority Keywords"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {kwRowsWithPlaceholders.length > 0 && (
                            <PaginationBar
                                from={(kwCurrentPage - 1) * kwRowsPerPage + 1}
                                to={Math.min(
                                    kwCurrentPage * kwRowsPerPage,
                                    kwRowsWithPlaceholders.length
                                )}
                                total={kwRowsWithPlaceholders.length}
                                currentPage={kwCurrentPage}
                                totalPages={kwTotalPages}
                                onPrev={() =>
                                    setKwCurrentPage((p) => Math.max(1, p - 1))
                                }
                                onNext={() =>
                                    setKwCurrentPage((p) => Math.min(kwTotalPages, p + 1))
                                }
                                onJump={(page) => setKwCurrentPage(page)}
                                rowsPerPage={kwRowsPerPage}
                                onRowsPerPageChange={(v) => {
                                    setKwRowsPerPage(v);
                                    setKwCurrentPage(1);
                                }}
                                rowsPerPageOptions={[5, 10, 20, 30]}
                                isMobile={true}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/** ==== Small UI atoms ==== */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${className}`}>
            {children}
        </th>
    );
}
function ThRight({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider ${className}`}>
            {children}
        </th>
    );
}

function PaginationBar({
    from,
    to,
    total,
    currentPage,
    totalPages,
    onPrev,
    onNext,
    onJump,
    rowsPerPage,
    onRowsPerPageChange,
    rowsPerPageOptions = [5, 10, 20],
    isMobile = false,
}: {
    from: number;
    to: number;
    total: number;
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    onJump: (page: number) => void;
    rowsPerPage: number;
    onRowsPerPageChange: (v: number) => void;
    rowsPerPageOptions?: number[];
    isMobile?: boolean;
}) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-medium">{from}</span> to <span className="font-medium">{to}</span> of <span className="font-medium">{total}</span> entries
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Rows per page:</span>
                    <select
                        className="border border-gray-300 rounded text-xs sm:text-sm px-2 py-1"
                        value={rowsPerPage}
                        onChange={(e) =>
                            onRowsPerPageChange(parseInt(e.target.value, 10))
                        }
                    >
                        {rowsPerPageOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 w-full justify-center sm:justify-start">
                    {!isMobile && (
                        <button
                            onClick={() => onJump(1)}
                            disabled={currentPage === 1}
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            First
                        </button>
                    )}
                    
                    <button
                        onClick={onPrev}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Previous
                    </button>

                    <div className="text-xs sm:text-sm text-gray-700 px-2">
                        Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                    </div>

                    <button
                        onClick={onNext}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Next
                    </button>
                    
                    {!isMobile && (
                        <button
                            onClick={() => onJump(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            Last
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    trend,
    color,
}: {
    title: string;
    value: string;
    trend: string;
    color: "blue" | "purple" | "green" | "orange" | "indigo" | "pink";
}) {
    const colorClasses = {
        blue: "border-blue-200 bg-blue-50 text-blue-700",
        purple: "border-purple-200 bg-purple-50 text-purple-700",
        green: "border-green-200 bg-green-50 text-green-700",
        orange: "border-orange-200 bg-orange-50 text-orange-700",
        indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
        pink: "border-pink-200 bg-pink-50 text-pink-700",
    } as const;

    return (
        <div className={`border rounded-lg sm:rounded-xl p-3 sm:p-4 ${colorClasses[color]}`}>
            <div className="text-xs sm:text-sm font-medium mb-1 opacity-80">
                {title}
            </div>
            <div className="flex items-baseline justify-between">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{value}</div>
                <div className="text-sm sm:text-lg font-semibold">{trend}</div>
            </div>
        </div>
    );
}