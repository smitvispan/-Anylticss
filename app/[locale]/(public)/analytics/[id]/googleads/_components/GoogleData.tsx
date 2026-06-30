"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
type Campaign = {
    id: string;
    campaignId?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    optimizationScore?: number | null;
    campaignBudgetAmountMicros?: string | null;
    metrics?: any;
    biddingStrategyType?: string | null;
    createdAt?: string;
    updatedAt?: string;
    userId?: string;
    userEmail?: string;
    customerId?: string;
    conversions?: number | null;
};
type Props = {
    initialCampaigns: Campaign[];
    customerId?: string;
    subAccountName?: string;
    subAccountId?: string;  // NEW: DB subAccount ID for sync
};
// ---------- Helpers ----------
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getPrevMonthRange = () => {
    const now = new Date();
    const firstOfThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthEnd = new Date(firstOfThis.getTime() - 1);
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    return { start: toISODate(lastMonthStart), end: toISODate(lastMonthEnd) };
};
const fmtShort = (n: number) => {
    if (!isFinite(n) || n === 0) return "0.00";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "T";
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (abs >= 1_000) return (n / 1_000).toFixed(2) + "K";
    return n.toFixed(2);
};
const getMetric = (metrics: any, key: string) => {
    if (!metrics) return 0;
    // Handle cost metrics
    if (key === "cost") {
        if (metrics.cost !== undefined) return Number(metrics.cost);
        if (metrics.cost_micros !== undefined) return Number(metrics.cost_micros) / 1_000_000;
        if (metrics.costMicros !== undefined) return Number(metrics.costMicros) / 1_000_000;
        return 0;
    }
    // Handle CPC metrics
    if (key === "avg_cpc") {
        if (metrics.avg_cpc !== undefined) return Number(metrics.avg_cpc) / (metrics.avg_cpc > 100000 ? 1_000_000 : 1);
        if (metrics.average_cpc !== undefined) return Number(metrics.average_cpc) / (metrics.average_cpc > 100000 ? 1_000_000 : 1);
        if (metrics.avg_cpc_micros !== undefined) return Number(metrics.avg_cpc_micros) / 1_000_000;
        if (metrics.averageCpc !== undefined) return Number(metrics.averageCpc) / (metrics.averageCpc > 100000 ? 1_000_000 : 1);
        if (metrics.averageCpcMicros !== undefined) return Number(metrics.averageCpcMicros) / 1_000_000;
        if (metrics.avgCpcMicros !== undefined) return Number(metrics.avgCpcMicros) / 1_000_000;
        return 0;
    }
    // Handle conversions
    if (key === "conversions") {
        if (metrics.conversions !== undefined) return Number(metrics.conversions);
        if (metrics.all_conversions !== undefined) return Number(metrics.all_conversions);
        if (metrics.allConversions !== undefined) return Number(metrics.allConversions);
        return 0;
    }
    // Handle conversion value
    if (key === "conversion_value") {
        if (metrics.conversions_value !== undefined) return Number(metrics.conversions_value);
        if (metrics.conversionsValue !== undefined) return Number(metrics.conversionsValue);
        if (metrics.all_conversions_value !== undefined) return Number(metrics.all_conversions_value);
        if (metrics.allConversionsValue !== undefined) return Number(metrics.allConversionsValue);
        return 0;
    }
    // Handle views (for video ads)
    if (key === "views") {
        if (metrics.views !== undefined) return Number(metrics.views);
        if (metrics.video_views !== undefined) return Number(metrics.video_views);
        if (metrics.videoViews !== undefined) return Number(metrics.videoViews);
        return 0;
    }
    return Number(metrics[key] ?? 0);
};
// ---------- Component ----------
export default function GoogleData({ initialCampaigns, customerId, subAccountName, subAccountId }: Props) {
    // data & status
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncLoading, setSyncLoading] = useState(false);  // NEW: For fetch button loading
    // pagination
    const PAGE_SIZE = 5;
    const [page, setPage] = useState(1);
    // date controls (driven by header query params)
    const { start: defaultStart, end: defaultEnd } = getPrevMonthRange();
    const searchParams = useSearchParams();
    const searchParamsString = searchParams?.toString();
    const [startDate, setStartDate] = useState<string>(defaultStart);
    const [endDate, setEndDate] = useState<string>(defaultEnd);

    useEffect(() => {
        const fallback = getPrevMonthRange();
        const params = new URLSearchParams(searchParamsString || "");
        const start = params.get("start") || fallback.start;
        const end = params.get("end") || fallback.end;
        setStartDate(start);
        setEndDate(end);
    }, [searchParamsString]);
    const aggregated = useMemo(() => {
        const totalClicks = campaigns.reduce((s, c) => s + getMetric(c.metrics, "clicks"), 0);
        const totalImpressions = campaigns.reduce((s, c) => s + getMetric(c.metrics, "impressions"), 0);
        const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || getMetric(c.metrics, "conversions")), 0);
        const totalConversionValue = campaigns.reduce((s, c) => s + getMetric(c.metrics, "conversion_value"), 0);
        const totalCost = campaigns.reduce((s, c) => s + getMetric(c.metrics, "cost"), 0);
        const avgCpc = totalClicks ? totalCost / totalClicks : 0;
        const ctr = totalImpressions ? (totalClicks / totalImpressions) * 100 : 0;
        const convRate = totalClicks ? (totalConversions / totalClicks) * 100 : 0;
        const avgCpm = totalImpressions ? totalCost / (totalImpressions / 1000) : 0;
        const costPerConv = totalConversions ? totalCost / totalConversions : 0;
        const roas = totalCost ? (totalConversionValue / totalCost) * 100 : 0;
        return {
            totalClicks,
            totalImpressions,
            totalConversions,
            totalConversionValue,
            totalCost,
            avgCpc,
            avgCpm,
            ctr,
            convRate,
            costPerConv,
            roas,
        };
    }, [campaigns]);
    // Filter campaigns by advertising channel type
    const searchAds = useMemo(() => campaigns.filter(c =>
        c.advertisingChannelType === "SEARCH" || c.advertisingChannelType === "PERFORMANCE_MAX"
    ), [campaigns]);
    const displayAds = useMemo(() => campaigns.filter(c =>
        c.advertisingChannelType === "DISPLAY"
    ), [campaigns]);
    const videoAds = useMemo(() => campaigns.filter(c =>
        c.advertisingChannelType === "VIDEO" || c.advertisingChannelType === "MULTI_CHANNEL"
    ), [campaigns]);
    // Calculate metrics for each ad type with requested parameters
    const searchAdsMetrics = useMemo(() => {
        const totalClicks = searchAds.reduce((s, c) => s + getMetric(c.metrics, "clicks"), 0);
        const totalImpressions = searchAds.reduce((s, c) => s + getMetric(c.metrics, "impressions"), 0);
        const totalConversions = searchAds.reduce((s, c) => s + (c.conversions || getMetric(c.metrics, "conversions")), 0);
        const totalCost = searchAds.reduce((s, c) => s + getMetric(c.metrics, "cost"), 0);
        const ctr = totalImpressions ? (totalClicks / totalImpressions) * 100 : 0;
        const costPerConv = totalConversions ? totalCost / totalConversions : 0;
        return {
            totalCost,
            totalClicks,
            totalImpressions,
            totalConversions,
            costPerConv,
            ctr,
            count: searchAds.length
        };
    }, [searchAds]);
    const displayAdsMetrics = useMemo(() => {
        const totalClicks = displayAds.reduce((s, c) => s + getMetric(c.metrics, "clicks"), 0);
        const totalImpressions = displayAds.reduce((s, c) => s + getMetric(c.metrics, "impressions"), 0);
        const totalConversions = displayAds.reduce((s, c) => s + (c.conversions || getMetric(c.metrics, "conversions")), 0);
        const totalCost = displayAds.reduce((s, c) => s + getMetric(c.metrics, "cost"), 0);
        const ctr = totalImpressions ? (totalClicks / totalImpressions) * 100 : 0;
        const costPerConv = totalConversions ? totalCost / totalConversions : 0;
        return {
            totalImpressions,
            totalClicks,
            totalCost,
            totalConversions,
            costPerConv,
            ctr,
            count: displayAds.length
        };
    }, [displayAds]);
    const videoAdsMetrics = useMemo(() => {
        const totalViews = videoAds.reduce((s, c) => s + getMetric(c.metrics, "views"), 0);
        const totalImpressions = videoAds.reduce((s, c) => s + getMetric(c.metrics, "impressions"), 0);
        const totalConversions = videoAds.reduce((s, c) => s + (c.conversions || getMetric(c.metrics, "conversions")), 0);
        const totalCost = videoAds.reduce((s, c) => s + getMetric(c.metrics, "cost"), 0);
        const costPerConv = totalConversions ? totalCost / totalConversions : 0;
        const ctr = totalImpressions ? (getMetric(videoAds[0]?.metrics, "clicks") / totalImpressions) * 100 : 0;
        return {
            totalViews,
            totalCost,
            totalImpressions,
            totalConversions,
            costPerConv,
            ctr,
            count: videoAds.length
        };
    }, [videoAds]);
    const sortedByClicks = useMemo(() => {
        return [...campaigns].sort((a, b) => getMetric(b.metrics, "clicks") - getMetric(a.metrics, "clicks"));
    }, [campaigns]);
    const totalPages = Math.max(1, Math.ceil(sortedByClicks.length / PAGE_SIZE));
    const pageItems = sortedByClicks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const load = useCallback(async () => {
        if (!customerId) {
            setError("No customer ID available");
            return;
        }
        setLoading(true);
        setError(null);
        const startISO = startDate;
        const endISO = endDate;
        try {
            // Fetch campaigns with date filter for specific customerId
            const queryParams = new URLSearchParams({
                start: startISO,
                end: endISO,
                customerId
            });
            if (subAccountId) {
                queryParams.set("accountId", subAccountId);
            }
            console.log("🔍 Fetching campaigns with params:", queryParams.toString());
            const res = await fetch(`/api/campaigns?${queryParams}`);
            const data = await res.json();
            if (res.ok && data?.campaigns) {
                setCampaigns(data.campaigns);
                console.log(`✅ Loaded ${data.campaigns.length} campaigns for account: ${customerId} from ${startISO} to ${endISO}`);
            } else {
                throw new Error(data?.error || "Failed to load campaigns");
            }
            setPage(1);
        } catch (err: any) {
            console.error("❌ Error loading campaigns:", err);
            setError(err.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [customerId, endDate, startDate, subAccountId]);
    // NEW: Function to handle manual fetch/sync
    const handleFetchSync = async () => {
        if (!subAccountId || !customerId) {
            setError("Missing account or customer ID for sync");
            return;
        }
        setSyncLoading(true);
        setError(null);
        try {
            console.log("🔄 Triggering manual sync for customer:", customerId);
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: subAccountId, customerId, start: startDate, end: endDate }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                console.log("✅ Sync successful, reloading campaigns...");
                // Reload campaigns after sync
                await load();
            } else {
                throw new Error(data?.error || "Sync failed");
            }
        } catch (err: any) {
            console.error("❌ Error during sync:", err);
            setError(err.message ?? String(err));
        } finally {
            setSyncLoading(false);
        }
    };
    useEffect(() => {
        if (new Date(startDate) > new Date(endDate)) {
            setError("Start date cannot be after End date.");
            return;
        } else {
            setError(null);
        }
        load();
    }, [customerId, endDate, load, startDate]);
    const dateLabel = useMemo(() => `${startDate} → ${endDate}`, [startDate, endDate]);
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
                {/* Header Section */}
                <div className="animate-slide-down">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 tracking-tight">
                                    Google Ads Overview
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                                <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-gray-200/60">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>{sortedByClicks.length} campaigns</span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-gray-200/60 whitespace-nowrap">
                                    {dateLabel}
                                </div>
                                {customerId && subAccountName && (
                                    <div className="bg-blue-100 text-blue-700 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border border-blue-200 truncate max-w-[200px] lg:max-w-none">
                                        {subAccountName} ({customerId})
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Action Buttons - UPDATED: Renamed "Refresh" to "Reload" and added "Fetch" button */}
                        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4 lg:mt-0">
                            <button
                                onClick={load}
                                disabled={loading}
                                className="group relative bg-white border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 min-w-[100px] sm:min-w-[140px] justify-center text-sm sm:text-base"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white rounded-lg sm:rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                {loading ? (
                                    <>
                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin relative z-10"></div>
                                        <span className="relative z-10">Reloading...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 relative z-10 transform group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span className="relative z-10">Reload</span>
                                    </>
                                )}
                            </button>
                            {/* NEW: Fetch/Sync Button */}
                            <button
                                onClick={handleFetchSync}
                                disabled={syncLoading || !subAccountId || !customerId}
                                className="group relative bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 min-w-[100px] sm:min-w-[140px] justify-center text-sm sm:text-base"
                            >
                                <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                {syncLoading ? (
                                    <>
                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                                        <span className="relative z-10">Fetching...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="relative z-10">Fetch</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Filter Controls */}
                <div className="animate-slide-up">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/60 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-500">
                        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start lg:items-center">
                            <div className="flex-1 w-full">
                                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Date range</div>
                                <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-gray-800">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-medium">{startDate} → {endDate}</span>
                                    <span className="text-xs text-gray-500">(managed in header)</span>
                                </div>
                            </div>
                            {customerId && subAccountName && (
                                <div className="flex-1 w-full">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Account</label>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-2 sm:p-3 text-xs sm:text-sm font-medium text-blue-800 truncate">
                                        {subAccountName} ({customerId})
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {error && (
                    <div className="animate-shake bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-red-700 flex items-start sm:items-center gap-2 sm:gap-3">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm sm:text-base">Error loading data</div>
                            <div className="text-xs sm:text-sm opacity-90 truncate">{error}</div>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-600 hover:text-red-800 transition-colors duration-200 flex-shrink-0"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                {/* Main Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-stagger">
                    {/* Performance Metrics */}
                    <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-sm hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 sm:hover:-translate-y-2">
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Performance Metrics</h3>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-gray-100">
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Clicks</div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 animate-count-up">{fmtShort(aggregated.totalClicks)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">CTR</div>
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">{aggregated.ctr.toFixed(2)}%</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Impressions</div>
                                    <div className="text-lg sm:text-xl font-semibold text-gray-900">{fmtShort(aggregated.totalImpressions)}</div>
                                </div>
                                <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-blue-50 rounded-full border border-blue-100">
                                    <span className="text-blue-700 text-xs sm:text-sm font-medium">Engagement</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Conversion Metrics */}
                    <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-sm hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 sm:hover:-translate-y-2 delay-75">
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Conversion Metrics</h3>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-gray-100">
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Conversions</div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 animate-count-up">{fmtShort(aggregated.totalConversions)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Conv. Rate</div>
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">{aggregated.convRate.toFixed(2)}%</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Cost / Conversion</div>
                                    <div className="text-lg sm:text-xl font-semibold text-gray-900">₹{fmtShort(aggregated.costPerConv)}</div>
                                </div>
                                <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-green-50 rounded-full border border-green-100">
                                    <span className="text-green-700 text-xs sm:text-sm font-medium">ROI</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Cost Metrics */}
                    <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-sm hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 sm:hover:-translate-y-2 delay-150">
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Cost Analysis</h3>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-gray-100">
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Cost</div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 animate-count-up">₹{fmtShort(aggregated.totalCost)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Avg. CPC</div>
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">₹{fmtShort(aggregated.avgCpc)}</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Avg. CPM</div>
                                    <div className="text-lg sm:text-xl font-semibold text-gray-900">₹{fmtShort(aggregated.avgCpm)}</div>
                                </div>
                                <div className="px-2.5 py-1 sm:px-3 sm:py-1 bg-purple-50 rounded-full border border-purple-100">
                                    <span className="text-purple-700 text-xs sm:text-sm font-medium">Cost</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Ad Type Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-stagger-delay">
                    {/* Search Ads */}
                    <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-sm hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-0.5 sm:hover:-translate-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"></div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Search Ads</h3>
                            </div>
                            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium border border-orange-100 self-start sm:self-center">
                                {searchAdsMetrics.count} campaigns
                            </span>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-orange-600 mb-1 font-medium">Cost</div>
                                    <div className="text-sm font-bold text-gray-900">₹{fmtShort(searchAdsMetrics.totalCost)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-orange-600 mb-1 font-medium">Clicks</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(searchAdsMetrics.totalClicks)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-orange-600 mb-1 font-medium">Impressions</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(searchAdsMetrics.totalImpressions)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-orange-600 mb-1 font-medium">Conversions</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(searchAdsMetrics.totalConversions)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-orange-600 mb-1 font-medium">Cost/Conv</div>
                                    <div className="text-sm font-bold text-gray-900">₹{fmtShort(searchAdsMetrics.costPerConv)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-orange-600 mb-1 font-medium">CTR</div>
                                    <div className="text-sm font-bold text-gray-900">{searchAdsMetrics.ctr.toFixed(2)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Display Ads */}
                    <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-sm hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-0.5 sm:hover:-translate-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full"></div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Display Ads</h3>
                            </div>
                            <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium border border-pink-100 self-start sm:self-center">
                                {displayAdsMetrics.count} campaigns
                            </span>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-pink-50 rounded-lg sm:rounded-xl border border-pink-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-pink-600 mb-1 font-medium">Impressions</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(displayAdsMetrics.totalImpressions)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-pink-50 rounded-lg sm:rounded-xl border border-pink-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-pink-600 mb-1 font-medium">Clicks</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(displayAdsMetrics.totalClicks)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-pink-50 rounded-lg sm:rounded-xl border border-pink-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-pink-600 mb-1 font-medium">Cost</div>
                                    <div className="text-sm font-bold text-gray-900">₹{fmtShort(displayAdsMetrics.totalCost)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-pink-50 rounded-lg sm:rounded-xl border border-pink-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-pink-600 mb-1 font-medium">Conversions</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(displayAdsMetrics.totalConversions)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-pink-50 rounded-lg sm:rounded-xl border border-pink-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-pink-600 mb-1 font-medium">Cost/Conv</div>
                                    <div className="text-sm font-bold text-gray-900">₹{fmtShort(displayAdsMetrics.costPerConv)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-pink-50 rounded-lg sm:rounded-xl border border-pink-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-pink-600 mb-1 font-medium">CTR</div>
                                    <div className="text-sm font-bold text-gray-900">{displayAdsMetrics.ctr.toFixed(2)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Video Ads */}
                    <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/60 shadow-sm hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-0.5 sm:hover:-translate-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"></div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Video Ads</h3>
                            </div>
                            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium border border-teal-100 self-start sm:self-center">
                                {videoAdsMetrics.count} campaigns
                            </span>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl border border-teal-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-teal-600 mb-1 font-medium">Views</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(videoAdsMetrics.totalViews)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl border border-teal-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-teal-600 mb-1 font-medium">Cost</div>
                                    <div className="text-sm font-bold text-gray-900">₹{fmtShort(videoAdsMetrics.totalCost)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl border border-teal-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-teal-600 mb-1 font-medium">Impressions</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(videoAdsMetrics.totalImpressions)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl border border-teal-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-teal-600 mb-1 font-medium">Conversions</div>
                                    <div className="text-sm font-bold text-gray-900">{fmtShort(videoAdsMetrics.totalConversions)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl border border-teal-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-teal-600 mb-1 font-medium">Cost/Conv</div>
                                    <div className="text-sm font-bold text-gray-900">₹{fmtShort(videoAdsMetrics.costPerConv)}</div>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl border border-teal-100 group-hover:scale-105 transition-transform duration-300">
                                    <div className="text-xs text-teal-600 mb-1 font-medium">CTR</div>
                                    <div className="text-sm font-bold text-gray-900">{videoAdsMetrics.ctr.toFixed(2)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Campaigns Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm p-3 sm:p-4 lg:p-6 animate-fade-in-up">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Top Campaigns</h2>
                            <p className="text-xs sm:text-sm text-gray-600">Sorted by clicks (descending) • {dateLabel}</p>
                        </div>
                        <div className="flex flex-col xs:flex-row items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-1.5 sm:gap-2 order-2 xs:order-1">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded sm:rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 text-xs sm:text-sm font-medium hover:shadow-md whitespace-nowrap"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded sm:rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 text-xs sm:text-sm font-medium hover:shadow-md whitespace-nowrap"
                                >
                                    Previous
                                </button>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 rounded sm:rounded-lg border border-gray-200 order-1 xs:order-2">
                                Page {page} of {totalPages}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 order-3">
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded sm:rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 text-xs sm:text-sm font-medium hover:shadow-md whitespace-nowrap"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                    className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded sm:rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 text-xs sm:text-sm font-medium hover:shadow-md whitespace-nowrap"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto -mx-1 sm:mx-0 rounded border border-gray-200">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        <span className="hidden sm:inline">Clicks</span>
                                        <span className="sm:hidden">Clicks</span>
                                    </th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        <span className="hidden sm:inline">CTR</span>
                                        <span className="sm:hidden">CTR</span>
                                    </th>
                                    <th className="hidden sm:table-cell px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Conversions</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        <span className="hidden sm:inline">Cost/Conv</span>
                                        <span className="sm:hidden">C/Conv</span>
                                    </th>
                                    <th className="hidden xs:table-cell px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pageItems.map((c, idx) => {
                                    const clicks = getMetric(c.metrics, "clicks");
                                    const impressions = getMetric(c.metrics, "impressions");
                                    const ctr = impressions ? (clicks / impressions) * 100 : 0;
                                    const conversions = c.conversions || getMetric(c.metrics, "conversions");
                                    const cost = getMetric(c.metrics, "cost");
                                    const costPerConv = conversions ? cost / conversions : 0;
                                    const updated = c.updatedAt ?? c.createdAt ?? "";
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 transition-all duration-200 group animate-fade-in">
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                                {(page - 1) * PAGE_SIZE + idx + 1}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
                                                <div className="max-w-[150px] sm:max-w-2xl">
                                                    <div className="text-xs sm:text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                                                        {c.name ?? c.campaignId ?? "Unnamed Campaign"}
                                                    </div>
                                                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 mt-1">
                                                        {c.status && (
                                                            <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'ENABLED'
                                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                                : c.status === 'PAUSED'
                                                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                                                                }`}>
                                                                {c.status.toLowerCase()}
                                                            </span>
                                                        )}
                                                        {c.customerId && (
                                                            <span className="text-xs text-gray-500 truncate">
                                                                Acc: {c.customerId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-right font-semibold text-gray-900">
                                                {fmtShort(clicks)}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-gray-600">
                                                {ctr.toFixed(2)}%
                                            </td>
                                            <td className="hidden sm:table-cell px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                                {fmtShort(conversions)}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-right font-semibold text-gray-900">
                                                ₹{fmtShort(costPerConv)}
                                            </td>
                                            <td className="hidden xs:table-cell px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-gray-500">
                                                {updated ? new Date(updated).toLocaleDateString() : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {pageItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                                            <div className="text-gray-500 text-base sm:text-lg mb-1 sm:mb-2">No campaigns found</div>
                                            <div className="text-gray-400 text-xs sm:text-sm">
                                                No campaigns available for the selected account and date range. Use the <strong>Fetch</strong> button to sync fresh data.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Table Footer */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 sm:pt-4 border-t border-gray-200">
                        <div className="text-xs sm:text-sm text-gray-600">
                            Showing {pageItems.length} of {sortedByClicks.length} campaigns
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-right">
                            Sorted by performance • Date range: {dateLabel}
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
@keyframes slide-down {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
@keyframes slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
@keyframes stagger {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
@keyframes dropdown {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
@keyframes count-up {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.animate-slide-down {
    animation: slide-down 0.6s ease-out;
}
.animate-slide-up {
    animation: slide-up 0.6s ease-out 0.2s both;
}
.animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out 0.4s both;
}
.animate-stagger > * {
    animation: stagger 0.6s ease-out both;
}
.animate-stagger > *:nth-child(1) { animation-delay: 0.1s; }
.animate-stagger > *:nth-child(2) { animation-delay: 0.2s; }
.animate-stagger > *:nth-child(3) { animation-delay: 0.3s; }
.animate-stagger-delay > * {
    animation: stagger 0.6s ease-out 0.5s both;
}
.animate-stagger-delay > *:nth-child(1) { animation-delay: 0.6s; }
.animate-stagger-delay > *:nth-child(2) { animation-delay: 0.7s; }
.animate-stagger-delay > *:nth-child(3) { animation-delay: 0.8s; }
.animate-dropdown {
    animation: dropdown 0.2s ease-out;
}
.animate-shake {
    animation: shake 0.5s ease-in-out;
}
.animate-count-up {
    animation: count-up 0.8s ease-out 0.3s both;
}
.animate-fade-in {
    animation: fade-in-up 0.5s ease-out;
}
            `}</style>
        </div>
    );
}
