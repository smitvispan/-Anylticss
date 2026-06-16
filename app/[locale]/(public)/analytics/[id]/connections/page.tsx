import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import PricingModal from "@/components/modals/PricingModal";
import FacebookUser from "@/models/FacebookUser";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import { formatPlanLimit, hasReachedPlanLimit } from "@/lib/plan-limits";

function SearchConsoleLogo({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 72 72" fill="none" className={className} aria-hidden="true">
            <circle cx="18" cy="47" r="13" fill="#FBBC05" />
            <circle cx="30" cy="47" r="9" fill="#EA4335" />
            <rect x="24" y="20" width="20" height="40" rx="10" fill="#34A853" />
            <rect x="42" y="8" width="22" height="52" rx="11" fill="#4285F4" />
            <path
                d="M10.4 55.2 2.8 62.8a4.5 4.5 0 0 0 6.36 6.36l7.64-7.64A14.8 14.8 0 0 1 10.4 55.2Z"
                fill="#FBBC05"
            />
        </svg>
    );
}

function SourceLogo({
    source,
    className,
}: {
    source: { icon?: string; iconType?: string; iconClassName?: string };
    className?: string;
}) {
    if (source.iconType === "search-console") {
        return <SearchConsoleLogo className={className} />;
    }

    return <Icon icon={source.icon || "logos:google-icon"} className={`${className || ""} ${source.iconClassName || ""}`.trim()} />;
}

export default async function ConnectionsPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id, locale } = await params;
    await connectDB();

    const user = await User.findById(id).select({
        _id: 1,
        email: 1,
        role: 1,
        parent_client_id: 1,
        activeSubscription: 1,
    }).populate({
        path: "activeSubscription",
        populate: { path: "planId" }
    }).lean();

    if (!user) notFound();

    const isTeamUser = user.role === "user" && user.parent_client_id;
    const ownerId = isTeamUser ? String(user.parent_client_id) : id;
    const ownerUser = isTeamUser
        ? await User.findById(ownerId).select({
            _id: 1,
            email: 1,
            activeSubscription: 1,
        }).populate({
            path: "activeSubscription",
            populate: { path: "planId" }
        }).lean()
        : user;

    const plan = (ownerUser as any)?.activeSubscription?.planId;
    const targetEmail = ownerUser?.email || user.email;
    const fbUsers = await FacebookUser.find({ adminId: ownerId }).select("_id").lean();
    const fbUserIds = fbUsers.map(u => u._id);

    const [
        connectedPageSourceIds,
        connectedInstagramSourceIds,
        connectedAdSourceIds,
        connectedGoogleAdsSourceIds,
        connectedSearchConsoleSourceIds,
        googleAdsResourceCount,
        searchConsoleResourceCount,
    ] = await Promise.all([
        fbUserIds.length ? Page.distinct("userId", { userId: { $in: fbUserIds } }) : [],
        fbUserIds.length ? InstagramAccount.distinct("userId", { userId: { $in: fbUserIds } }) : [],
        fbUserIds.length ? AdAccount.distinct("userId", { userId: { $in: fbUserIds } }) : [],
        targetEmail
            ? GoogleAdsAccount.distinct("googleUserId", { userEmail: targetEmail, googleUserId: { $ne: null } })
            : [],
        targetEmail
            ? GoogleSearchConsoleAccount.distinct("googleUserId", { userEmail: targetEmail, googleUserId: { $ne: null } })
            : [],
        GoogleAdsAccount.countDocuments(targetEmail ? { userEmail: targetEmail } : { _id: null }),
        GoogleSearchConsoleAccount.countDocuments(targetEmail ? { userEmail: targetEmail } : { _id: null }),
    ]);

    // Show connection-level usage on the cards, not downstream page/account totals.
    const pageCount = connectedPageSourceIds.length;
    const instaCount = connectedInstagramSourceIds.length;
    const adCount = connectedAdSourceIds.length;
    const gadsCount = connectedGoogleAdsSourceIds.length || (googleAdsResourceCount > 0 ? 1 : 0);
    const seoCount = connectedSearchConsoleSourceIds.length || (searchConsoleResourceCount > 0 ? 1 : 0);

    const metaConnectUrl = `/api/facebook/connect?adminId=${ownerId}&workspaceId=${id}&locale=${locale}`;
    const googleConnectUrl = `/api/google/connect?adminId=${ownerId}&workspaceId=${id}&locale=${locale}`;

    const suites = [
        {
            id: "meta-suite",
            name: "Meta Business Suite",
            eyebrow: "Facebook Login",
            description: "Connect Facebook Pages, Instagram profiles, and Meta Ads accounts together from one place.",
            connectUrl: metaConnectUrl,
            connectLabel: "Connect Meta Suite",
            borderClassName: "border-sky-200/80",
            panelClassName: "bg-gradient-to-br from-sky-50 via-white to-fuchsia-50",
            buttonClassName: "bg-gradient-to-r from-[#0866ff] via-[#4f46e5] to-[#d62976] shadow-[0_18px_45px_-18px_rgba(79,70,229,0.75)] hover:brightness-105",
            sources: [
                {
                    id: "facebook",
                    name: "Facebook Page",
                    description: "Track reach, engagement, and page performance.",
                    icon: "logos:facebook",
                    count: pageCount,
                    limit: plan?.maxFacebookPages,
                    badgeClassName: "border-blue-100 bg-blue-50 text-blue-700",
                },
                {
                    id: "instagram",
                    name: "Instagram Page",
                    description: "Monitor business profile growth and content reach.",
                    icon: "logos:instagram-icon",
                    count: instaCount,
                    limit: plan?.maxInstagramAccounts,
                    badgeClassName: "border-pink-100 bg-pink-50 text-pink-700",
                },
                {
                    id: "meta-ads",
                    name: "Meta Ads",
                    description: "Sync ad accounts, campaigns, and media buying data.",
                    icon: "simple-icons:meta",
                    iconClassName: "text-[#0866ff]",
                    count: adCount,
                    limit: plan?.maxAdAccounts,
                    badgeClassName: "border-indigo-100 bg-indigo-50 text-indigo-700",
                },
            ],
        },
        {
            id: "google-suite",
            name: "Google Growth Suite",
            eyebrow: "Google Login",
            description: "Link Google Ads and Search Console together to manage paid performance and SEO reporting.",
            connectUrl: googleConnectUrl,
            connectLabel: "Connect Google Suite",
            borderClassName: "border-amber-200/80",
            panelClassName: "bg-gradient-to-br from-amber-50 via-white to-emerald-50",
            buttonClassName: "bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] shadow-[0_18px_45px_-18px_rgba(66,133,244,0.75)] hover:brightness-105",
            sources: [
                {
                    id: "googleads",
                    name: "Google Ads",
                    description: "Track campaign spend, clicks, and conversion performance.",
                    icon: "logos:google-ads",
                    count: gadsCount,
                    limit: plan?.maxGoogleAdsAccounts,
                    badgeClassName: "border-blue-100 bg-blue-50 text-blue-700",
                },
                {
                    id: "google-search-console",
                    name: "Search Console",
                    description: "Fetch website visibility, search queries, and ranking data.",
                    iconType: "search-console",
                    count: seoCount,
                    limit: plan?.maxSeoReports,
                    badgeClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-10 text-center lg:text-left">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Connect Data Sources</h1>
                    <p className="text-slate-500 mt-3 text-lg max-w-2xl">
                        Link your social media and advertising accounts to automatically generate reports and track performance across all channels.
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {suites.map((suite) => {
                        const connectedSources = suite.sources.filter((source) => source.count > 0).length;
                        const isSuiteLimitReached = plan
                            ? suite.sources.every((source) => hasReachedPlanLimit(source.count, source.limit))
                            : true;

                        return (
                            <Card
                                key={suite.id}
                                className={`overflow-hidden border-2 ${suite.borderClassName} bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                            >
                                <CardContent className="p-0">
                                    <div className={`border-b border-white/70 px-6 py-6 sm:px-8 sm:py-8 ${suite.panelClassName}`}>
                                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-3">
                                                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    {suite.eyebrow}
                                                </div>
                                                <div>
                                                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{suite.name}</h2>
                                                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                                                        {suite.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                                                <div className="flex -space-x-3">
                                                    {suite.sources.map((source) => (
                                                        <div
                                                            key={source.id}
                                                            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/90 shadow-lg shadow-slate-200/70 backdrop-blur"
                                                        >
                                                            <SourceLogo source={source} className="h-8 w-8" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-right shadow-sm">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Active Sources</p>
                                                    <p className="mt-1 text-lg font-extrabold text-slate-900">
                                                        {connectedSources} / {suite.sources.length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-6 sm:p-8">
                                        {suite.sources.map((source) => {
                                            const isLimitReached = plan ? hasReachedPlanLimit(source.count, source.limit) : true;

                                            return (
                                                <div
                                                    key={source.id}
                                                    className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm"
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
                                                                <SourceLogo source={source} className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-bold text-slate-900">{source.name}</h3>
                                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                                    {source.description}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                            <div className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${source.badgeClassName}`}>
                                                                {source.count} / {formatPlanLimit(source.limit)} Connected
                                                            </div>
                                                            {isLimitReached && (
                                                                <div className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                                                                    Limit Reached
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isSuiteLimitReached ? (
                                            <PricingModal>
                                                <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-amber-100 transition hover:bg-amber-600">
                                                    <Icon icon="lucide:arrow-up-circle" className="h-5 w-5" />
                                                    Upgrade to Add More
                                                </button>
                                            </PricingModal>
                                        ) : (
                                            <a
                                                href={suite.connectUrl}
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 ${suite.buttonClassName}`}
                                            >
                                                <Icon icon="lucide:link" className="h-5 w-5" />
                                                {suite.connectLabel}
                                            </a>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="mt-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                        <Icon icon="lucide:shield-check" className="w-6 h-6 text-sky-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">Secure Data Connection</h4>
                    <p className="text-slate-500 mt-2 max-w-xl text-sm">
                        We only request read-only permissions to fetch your analytics data. Your personal credentials are never shared with us; we use secure OAuth tokens encrypted in our database.
                    </p>
                </div>
            </div>
        </div>
    );
}
