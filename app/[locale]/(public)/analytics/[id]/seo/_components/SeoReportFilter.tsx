// //this code for using siteurl dropdown list

// // SeoReportFilter.tsx
// import React, { useState, useEffect } from "react";
// import { useSession } from "next-auth/react";
// import SeoReportTable from "./SEOReportCard";

// const SeoReportFilter = () => {
//     const [siteUrl, setSiteUrl] = useState("");
//     const [sites, setSites] = useState([]);
//     const [startDate, setStartDate] = useState("");
//     const [endDate, setEndDate] = useState("");
//     const [fetching, setFetching] = useState(false);

//     const { data: session } = useSession();

//     useEffect(() => {
//         if (session) {
//             // Fetch the sites from API
//             const fetchSites = async () => {
//                 try {
//                     const res = await fetch("/api/google/sites");
//                     const data = await res.json();
//                     setSites(data.sites || []);
//                 } catch (err) {
//                     console.error("Error fetching sites", err);
//                 }
//             };
//             fetchSites();
//         }
//     }, [session]);

//     const handleFetch = async () => {
//         if (!startDate || !endDate || !siteUrl) {
//             alert("Please select site and date range");
//             return;
//         }

//         setFetching(true);
//         try {
//             const res = await fetch("/api/seo", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ siteUrl, startDate, endDate }),
//             });

//             const json = await res.json();
//             if (!json.ok) {
//                 alert(json.error || "Failed to fetch SEO data");
//             } else {
//                 alert(`Fetched and stored ${json.result?.storedCount || 0} records`);
//             }
//         } catch (err) {
//             alert("Error Occured in setFetching function ");
//         } finally {
//             setFetching(false);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
//             <div className="max-w-7xl mx-auto">
//                 <div className="mb-8">
//                     <h1 className="text-3xl font-bold text-gray-900 mb-2">SEO Analytics Dashboard</h1>
//                     <p className="text-gray-600">
//                         Monitor your search performance and optimize your content strategy
//                     </p>
//                 </div>

//                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
//                     <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">
//                         <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
//                             {/* Site URL Dropdown */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">Site Domain</label>
//                                 <select
//                                     value={siteUrl}
//                                     onChange={(e) => setSiteUrl(e.target.value)}
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
//                                 >
//                                     <option value="">Select a site</option>
//                                     {sites.map((site: any) => (
//                                         <option key={site.siteUrl} value={site.siteUrl}>
//                                             {site.siteUrl}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>

//                             {/* Start Date */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
//                                 <input
//                                     type="date"
//                                     value={startDate}
//                                     onChange={(e) => setStartDate(e.target.value)}
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
//                                 />
//                             </div>

//                             {/* End Date */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
//                                 <input
//                                     type="date"
//                                     value={endDate}
//                                     onChange={(e) => setEndDate(e.target.value)}
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
//                                 />
//                             </div>
//                         </div>

//                         <button
//                             onClick={handleFetch}
//                             disabled={fetching}
//                             className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
//                         >
//                             {fetching ? (
//                                 <div className="flex items-center gap-2">
//                                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//                                     Fetching Data...
//                                 </div>
//                             ) : (
//                                 <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                                     </svg>
//                                     Fetch SEO Data
//                                 </div>
//                             )}
//                         </button>
//                     </div>
//                 </div>

//                 {/* Report Table */}
//                 <SeoReportTable siteUrl={siteUrl} start={startDate} end={endDate} />
//             </div>
//         </div>
//     );
// };

// export default SeoReportFilter;




















// // without siteurl dropdown
// // SeoReportFilter.tsx
// import React, { useState, useEffect } from "react";
// import { useSession } from "next-auth/react";
// import SeoReportTable from "./SEOReportCard";

// const SeoReportFilter = ({ siteUrl }: { siteUrl: string }) => {
//     const [startDate, setStartDate] = useState("");
//     const [endDate, setEndDate] = useState("");
//     const [fetching, setFetching] = useState(false);

//     const { data: session } = useSession();

//     const handleFetch = async () => {
//         if (!startDate || !endDate || !siteUrl) {
//             alert("Please select date range");
//             return;
//         }

//         setFetching(true);
//         try {
//             const res = await fetch("/api/seo", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ siteUrl, startDate, endDate }),
//             });

//             const json = await res.json();
//             if (!json.ok) {
//                 alert(json.error || "Failed to fetch SEO data");
//             } else {
//                 alert(`Fetched and stored ${json.result?.storedCount || 0} records`);
//             }
//         } catch (err) {
//             alert("Error occurred in setFetching function");
//         } finally {
//             setFetching(false);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
//             <div className="max-w-7xl mx-auto">
//                 <div className="mb-8">
//                     <h1 className="text-3xl font-bold text-gray-900 mb-2">SEO Analytics Dashboard</h1>
//                     <p className="text-gray-600">
//                         Monitoring search performance for: <strong>{siteUrl}</strong>
//                     </p>
//                 </div>

//                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
//                     <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">
//                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {/* Start Date */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
//                                 <input
//                                     type="date"
//                                     value={startDate}
//                                     onChange={(e) => setStartDate(e.target.value)}
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
//                                 />
//                             </div>

//                             {/* End Date */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
//                                 <input
//                                     type="date"
//                                     value={endDate}
//                                     onChange={(e) => setEndDate(e.target.value)}
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
//                                 />
//                             </div>
//                         </div>

//                         <button
//                             onClick={handleFetch}
//                             disabled={fetching}
//                             className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
//                         >
//                             {fetching ? (
//                                 <div className="flex items-center gap-2">
//                                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//                                     Fetching Data...
//                                 </div>
//                             ) : (
//                                 <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                                     </svg>
//                                     Fetch SEO Data
//                                 </div>
//                             )}
//                         </button>
//                     </div>
//                 </div>

//                 {/* Report Table */}
//                 <SeoReportTable siteUrl={siteUrl} start={startDate} end={endDate} />
//             </div>
//         </div>
//     );
// };

// export default SeoReportFilter;


















// 28 11 
// app/en/analytics/[gscSiteId]/seo/_components/SeoReportFilter.tsx

"use client";

import React, { useEffect, useState } from "react";
import SeoReportTable from "./SEOReportCard";

type Props = {
    siteUrl: string;
    gscSiteId: string;
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

const SeoReportFilter = ({ siteUrl, gscSiteId }: Props) => {
    const defaultRange = getLastMonthRange();
    const [startDate, setStartDate] = useState(defaultRange.start);
    const [endDate, setEndDate] = useState(defaultRange.end);
    const [fetching, setFetching] = useState(false);

    const handleFetch = async () => {
        if (!startDate || !endDate) {
            alert("Please select date range");
            return;
        }

        setFetching(true);
        try {
            const res = await fetch("/api/seo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    siteUrl: siteUrl || undefined,
                    startDate,
                    endDate,
                    gscSiteId,
                }),
            });
            const json = await res.json();
            if (!json.ok) {
                alert(json.error || "Failed to fetch SEO data");
            } else {
                alert(`Fetched and stored ${json.result?.storedCount ?? 0} records`);
            }
        } catch {
            alert("Error occurred while fetching SEO data");
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (siteUrl && startDate && endDate) {
            handleFetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteUrl]);

    const cleanSiteUrl = siteUrl?.replace("sc-domain:", "").split(".")[0].trim();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">SEO Analytics Dashboard</h1>
                    <p className="text-gray-600">
                        Active property id: <strong>{cleanSiteUrl}</strong>
                    </p>
                    <p className="text-sm text-gray-500">
                        Showing last month by default ({startDate} → {endDate})
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleFetch}
                            disabled={fetching}
                            className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {fetching ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Fetching Data...
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
                                    Fetch SEO Data
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                <SeoReportTable siteUrl={siteUrl} start={startDate} end={endDate} gscSiteId={gscSiteId} />
            </div>
        </div>
    );
};

export default SeoReportFilter;


