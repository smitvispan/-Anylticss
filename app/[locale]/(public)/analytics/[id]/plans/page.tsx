import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import User from "@/models/User";
import PlanCheckoutButton from "@/components/subscription/plan-checkout-button";
import { calculatePlanBillingPreview, formatBillingAmount } from "@/lib/subscription-billing";
import { Icon } from "@/components/ui/icon";
import { formatPlanLimit } from "@/lib/plan-limits";
import { getPlanDisplayName, isCustomPlanTier } from "@/lib/plan-catalog";
import CustomPlanRequestButton from "@/components/subscription/custom-plan-request-button";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";

export default async function ClientPlansPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    await connectDB();
    const user = await User.findById(id)
        .select({ name: 1, email: 1, role: 1, parent_client_id: 1, activeSubscription: 1 })
        .populate({
            path: "activeSubscription",
            populate: {
                path: "planId",
                select: { _id: 1, name: 1, price: 1, validityMonths: 1, canResell: 1 },
            },
        })
        .lean();

    if ((user as any)?.role === "user" && (user as any)?.parent_client_id) {
        redirect(`/${locale}/analytics/${String((user as any).parent_client_id)}/plans`);
    }

    const plans = await Plan.find({}).sort({ price: 1 }).lean();

    const activeSubscription = (user as any)?.activeSubscription;
    const currentPlan = activeSubscription?.planId;
    const currentPlanName = currentPlan ? getPlanDisplayName(currentPlan) : "No Active Plan";
    const currentPlanEndDate = activeSubscription?.endDate
        ? new Date(activeSubscription.endDate)
        : null;
    const remainingDays = currentPlanEndDate
        ? Math.max(
            0,
            Math.ceil((currentPlanEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        )
        : 0;
    const planCards = plans.map((plan) => {
        const preview = calculatePlanBillingPreview({
            currentSubscription: activeSubscription,
            targetPlan: plan,
        });

        return {
            plan,
            preview,
            displayName: getPlanDisplayName(plan),
            isCurrentPlan: preview.isCurrentPlan,
            isCustomPlan: isCustomPlanTier(plan),
        };
    });

    return (
        <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
            <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Upgrade & Subscribe</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Subscription Plans</h1>
                        <p className="text-sm text-slate-600">
                            View our available service tiers and limits to find the perfect plan for you.
                        </p>
                    </div>
                    <Link
                        href={`/analytics/${id}/subscription`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
                    >
                        <Icon icon="lucide:receipt-text" className="h-4 w-4" />
                        Plan Details
                    </Link>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur">
                    <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Active Plan
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{currentPlanName}</h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    {user?.name || "This workspace"} is currently on
                                    {" "}
                                    <span className="font-semibold text-slate-900">{currentPlanName}</span>.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Valid Until</p>
                            <p className="mt-2 text-lg font-bold text-slate-900">
                                {currentPlanEndDate ? currentPlanEndDate.toLocaleDateString() : "Not assigned"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Days Remaining</p>
                            <p className="mt-2 text-lg font-bold text-slate-900">
                                {currentPlanEndDate ? `${remainingDays} days` : "0 days"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {planCards.map(({ plan, preview, displayName, isCurrentPlan, isCustomPlan }) => {
                        return (
                            <div key={String(plan._id)} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur transition-all flex flex-col h-full hover:shadow-2xl hover:border-sky-200">
                                <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/50 to-white px-6 py-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
                                        <span className="text-lg font-bold text-sky-600">
                                            {isCustomPlan ? displayName : `₹${formatBillingAmount(Number(plan.price || 0))}`}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{plan.description || "Unlock all advanced analytics."}</p>
                                </div>

                                <div className="px-6 py-6 space-y-4 flex-grow">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users</p>
                                            <p className="text-sm font-semibold text-slate-700">{formatPlanLimit(plan.maxUsers)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SEO Reports</p>
                                                <p className="text-sm font-semibold text-slate-700">
                                                {isCustomPlan ? displayName : formatPlanLimit(plan.maxSeoReports)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Google Ads Accounts</p>
                                            <p className="text-sm font-semibold text-slate-700">{formatPlanLimit(plan.maxGoogleAdsAccounts)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reseller</p>
                                            <p className="text-sm font-semibold text-slate-700">{plan.canResell ? "Available" : "No"}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                                    {isCurrentPlan ? "Plan Status" : "Billing Preview"}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-slate-900">
                                                    {isCurrentPlan
                                                        ? "This is your current active plan."
                                                        : isCustomPlan
                                                            ? "Tell us your report assignment and account volume needs."
                                                        : preview.payableAmount > 0
                                                            ? `Upgrade & Pay ₹${formatBillingAmount(preview.payableAmount)} today`
                                                            : "No Razorpay charge required"}
                                                </p>
                                            </div>
                                            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                isCurrentPlan
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : preview.isUpgrade
                                                        ? "bg-sky-50 text-sky-700"
                                                        : "bg-amber-50 text-amber-700"
                                            }`}>
                                                <Icon
                                                    icon={
                                                        isCurrentPlan
                                                            ? "lucide:check-circle-2"
                                                            : preview.isUpgrade
                                                                ? "lucide:trending-up"
                                                                : "lucide:refresh-cw"
                                                    }
                                                    className="h-3.5 w-3.5"
                                                />
                                                {isCurrentPlan ? "Active" : isCustomPlan ? "Own Plan" : preview.isUpgrade ? "Upgrade" : "Switch"}
                                            </div>
                                        </div>

                                        {!isCurrentPlan && !isCustomPlan && (
                                            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                                                <div>
                                                    <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Full Price</p>
                                                    <p className="mt-1 font-bold text-slate-900">₹{formatBillingAmount(Number(plan.price || 0))}</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Unused Credit</p>
                                                    <p className="mt-1 font-bold text-emerald-700">₹{formatBillingAmount(preview.creditAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Upgrade & Pay</p>
                                                    <p className="mt-1 font-bold text-sky-700">₹{formatBillingAmount(preview.payableAmount)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="px-6 pb-6 mt-auto">
                                    <p className="text-xs text-center text-slate-400 font-medium mb-3">
                                        {isCustomPlan
                                            ? "Need more than 5 SEO reports or reseller onboarding? Send a custom request."
                                            : isCurrentPlan
                                            ? "This plan is already active on your workspace."
                                            : preview.payableAmount > 0
                                                ? `You will pay ₹${formatBillingAmount(preview.payableAmount)} after applying your unused plan credit.`
                                                : preview.creditAmount > 0
                                                    ? "Your unused credit fully covers this switch."
                                                    : "Switch instantly without a Razorpay charge."}
                                    </p>
                                    {isCustomPlan ? (
                                        isCurrentPlan ? (
                                            <div className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                                                Current Plan
                                            </div>
                                        ) : (
                                            <CustomPlanRequestButton
                                                planName={displayName}
                                                defaultName={user?.name || ""}
                                                defaultEmail={(user as any)?.email || ""}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                            />
                                        )
                                    ) : (
                                        <PlanCheckoutButton
                                            clientId={id}
                                            preview={{
                                                isCurrentPlan,
                                                payableAmount: preview.payableAmount,
                                                creditAmount: preview.creditAmount,
                                                currentPlanName: preview.currentPlanName,
                                            }}
                                            plan={{
                                                _id: String(plan._id),
                                                name: displayName,
                                                price: Number(plan.price || 0),
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
