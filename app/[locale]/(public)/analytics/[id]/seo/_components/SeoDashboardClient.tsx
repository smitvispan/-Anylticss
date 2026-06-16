"use client";

import React, { useCallback, useEffect, useState } from "react";
import SeoReportTable from "./SEOReportCard";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

type AccountInfo = {
  id: string;
  siteUrl: string;
  permissionLevel?: string | null;
  canSync?: boolean;
};

type ApiAccountResponse = {
  ok: boolean;
  error?: string;
  user?: { id: string; email?: string | null };
  account?: AccountInfo;
  accounts?: AccountInfo[];
};

function getLastMonthRange() {
  const now = new Date();
  const firstOfThis = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfPrev = new Date(firstOfThis.getTime() - 1);
  const firstOfPrev = new Date(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), 1);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: toISO(firstOfPrev), end: toISO(lastOfPrev) };
}

export default function SeoDashboardClient({ userId }: { userId: string }) {
  const defaultRange = getLastMonthRange();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [fetching, setFetching] = useState(false);

  const fetchAccount = useCallback(async () => {
    setLoadingAccount(true);
    setAccountError(null);
    try {
      const res = await fetch(`/api/seo/account?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      const data: ApiAccountResponse = await res.json();
      if (!data.ok || !data.account) {
        throw new Error(data.error || "No Search Console account found");
      }
      setAccount(data.account);
      setAccounts(Array.isArray(data.accounts) && data.accounts.length ? data.accounts : [data.account]);
    } catch (err: any) {
      setAccountError(err?.message || "Failed to load Search Console account");
    } finally {
      setLoadingAccount(false);
    }
  }, [userId]);

  const handleFetch = useCallback(async () => {
    if (!startDate || !endDate || !account?.id) {
      toast.error("Missing date range or account");
      return;
    }

    if (!account.canSync) {
      toast.info("Search Console account is not connected. Showing cached or demo data.");
      return;
    }

    setFetching(true);
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: account.siteUrl,
          startDate,
          endDate,
          gscSiteId: account.id,
          targetUserId: userId,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error || "Failed to fetch SEO data");
      } else if (json.result?.skipped) {
        toast.info(json.result?.message || "Search Console sync was skipped.");
      } else {
        const stored = json.result?.storedCount ?? 0;
        toast.success(`Fetched and stored ${stored} records`);
      }
    } catch {
      toast.error("Error occurred while fetching SEO data");
    } finally {
      setFetching(false);
    }
  }, [account?.canSync, account?.id, account?.siteUrl, endDate, startDate, userId]);

  useEffect(() => {
    if (userId) {
      fetchAccount();
    }
  }, [fetchAccount, userId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString || "");
    const start = params.get("start");
    const end = params.get("end");
    if (start) setStartDate(start);
    if (end) setEndDate(end);
  }, [searchParamsString]);

  useEffect(() => {
    if (account?.siteUrl && startDate && endDate && account.canSync) {
      handleFetch();
    }
  }, [account?.canSync, account?.siteUrl, endDate, handleFetch, startDate]);

  if (loadingAccount) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-700">Loading Search Console account…</p>
      </main>
    );
  }

  let displayAccount = account;
  if (accountError || !displayAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Account Not Linked</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            There is no SEO Report account linked to this profile. Please connect an account from the settings or contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const cleanSiteUrl = displayAccount!.siteUrl?.replace("sc-domain:", "").split(".")[0].trim();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SEO Analytics Dashboard</h1>
            <p className="text-gray-600">
              Active property id: <strong>{cleanSiteUrl}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Date range from header: {startDate} → {endDate}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
              <div className="flex-1">
                <div className="text-sm text-gray-700 font-semibold mb-1">Date range</div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-gray-800">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">
                    {startDate} → {endDate}
                  </span>
                  <span className="text-xs text-gray-500">(managed in header)</span>
                </div>
              </div>
              {accounts.length > 1 && (
                <div className="w-full lg:w-80">
                  <div className="text-sm text-gray-700 font-semibold mb-1">SEO property</div>
                  <select
                    value={displayAccount.id}
                    onChange={(e) => {
                      const nextAccount = accounts.find((entry) => entry.id === e.target.value) || null;
                      setAccount(nextAccount);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {accounts.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.siteUrl}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleFetch}
                disabled={fetching || !displayAccount.canSync}
                className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {fetching ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Fetching Data...
                  </div>
                ) : !displayAccount.canSync ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636A9 9 0 105.636 18.364M15 9l-6 6"
                      />
                    </svg>
                    Live Sync Unavailable
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh Data
                  </div>
                )}
              </button>
            </div>
            {!displayAccount.canSync && (
              <p className="mt-4 text-sm text-amber-700">
                This Search Console property is not connected for live sync. Cached or demo data will be shown.
              </p>
            )}
          </div>

          <SeoReportTable siteUrl={displayAccount!.siteUrl} start={startDate} end={endDate} gscSiteId={displayAccount!.id} userId={userId} />
        </div>
      </div>
    </main>
  );
}
