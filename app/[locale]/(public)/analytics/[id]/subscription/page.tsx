import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { formatPlanLimit } from "@/lib/plan-limits";
import { getPlanDisplayName, isCustomPlanTier } from "@/lib/plan-catalog";

export default async function SubscriptionPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id, locale } = await params;
    await connectDB();

    const user = await User.findById(id)
        .select({ role: 1, parent_client_id: 1, activeSubscription: 1 })
        .populate({
            path: "activeSubscription",
            populate: { path: "planId" },
        })
        .lean();

    if (!user) notFound();

    if ((user as any)?.role === "user" && (user as any)?.parent_client_id) {
        redirect(`/${locale}/analytics/${String((user as any).parent_client_id)}/subscription`);
    }

    const subscription = (user as any).activeSubscription;
    const plan = subscription?.planId;
    const isCustomPlan = isCustomPlanTier(plan);

    const limits = [
        { label: "Users", value: formatPlanLimit(plan?.maxUsers), isNumeric: false, icon: "lucide:users" },
        { label: "Facebook Pages", value: formatPlanLimit(plan?.maxFacebookPages), isNumeric: false, icon: "lucide:facebook" },
        { label: "Instagram Accounts", value: formatPlanLimit(plan?.maxInstagramAccounts), isNumeric: false, icon: "lucide:instagram" },
        { label: "Ad Accounts", value: formatPlanLimit(plan?.maxAdAccounts), isNumeric: false, icon: "lucide:megaphone" },
        { label: "Google Ads Accounts", value: formatPlanLimit(plan?.maxGoogleAdsAccounts), isNumeric: false, icon: "lucide:search" },
        { label: "SEO Reports", value: isCustomPlan ? "Custom" : formatPlanLimit(plan?.maxSeoReports), isNumeric: false, icon: "lucide:bar-chart-3" },
        { label: "Reseller Mode", value: plan?.canResell ? "Enabled" : "Disabled", icon: "lucide:briefcase" },
        { label: "Sub-Clients", value: formatPlanLimit(plan?.maxSubClients), isNumeric: false, icon: "lucide:network" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Plan Details</h1>
                    <p className="text-slate-500 mt-2">Manage your plan and track your resource usage.</p>
                </div>

                {!subscription ? (
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon icon="lucide:alert-circle" className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">No Active Plan</h2>
                        <p className="text-slate-500 mt-2">Your account does not have an active subscription plan linked. Please contact support.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Plan Overview Card */}
                        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Icon icon="lucide:shield-check" className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-sky-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Active Plan</span>
                                    <span className="text-slate-400 text-sm">Valid until {new Date(subscription.endDate).toLocaleDateString()}</span>
                                </div>
                                <h2 className="text-4xl font-bold mb-2">{getPlanDisplayName(plan) || "Premium Plan"}</h2>
                                <p className="text-slate-400 text-lg max-w-md">{plan?.description || "Access all your analytics tools in one powerful dashboard."}</p>

                                <div className="mt-8 flex items-center gap-6">
                                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Status</p>
                                        <p className="text-emerald-400 font-bold flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                            Healthy & Active
                                        </p>
                                    </div>
                                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Billing ID</p>
                                        <p className="text-white font-mono text-xs opacity-80">{String(subscription._id).toUpperCase().slice(0, 12)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Limits Grid */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Icon icon="lucide:sliders" className="w-5 h-5 text-sky-600" />
                                Resource Limits
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {limits.map((limit, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-sky-200 group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-sky-50 transition-colors">
                                                <Icon icon={limit.icon} className="w-5 h-5 text-slate-600 group-hover:text-sky-600" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{limit.label}</p>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-slate-900">{limit.value}</span>
                                            {(limit as any).isNumeric !== false && typeof limit.value === "number" && <span className="text-xs text-slate-400 font-medium">max</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Help/Upgrade Card */}
                        <div className="bg-sky-50 rounded-3xl p-8 border border-sky-100 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-200">
                                <Icon icon="lucide:rocket" className="w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-xl font-bold text-slate-900">Need more power?</h3>
                                <p className="text-slate-600 mt-1 text-sm">Upgrade your plan to unlock more users, SEO reports, ad accounts, and sub-client management features.</p>
                            </div>
                            <Link
                                href={`/analytics/${id}/plans`}
                                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
                            >
                                Upgrade Plan
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
