import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import User from "@/models/User";
import PlanCheckoutButton from "@/components/subscription/plan-checkout-button";
import { calculatePlanBillingPreview, formatBillingAmount } from "@/lib/subscription-billing";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { ensureAdminBillingUser } from "@/lib/admin-billing-user";
import { formatPlanLimit } from "@/lib/plan-limits";
import { getPlanDisplayName, isCustomPlanTier } from "@/lib/plan-catalog";
import CustomPlanRequestButton from "@/components/subscription/custom-plan-request-button";

export default async function AdminPlansPage() {
  const session = await auth();
  await connectDB();

  const plans = await Plan.find({}).sort({ price: 1 }).lean();
  const adminEmail = session?.user?.email?.trim() || "";
  const billingUserId = await ensureAdminBillingUser({
    email: adminEmail,
    name: session?.user?.name || null,
  });

  const billingUser = billingUserId
    ? await User.findById(billingUserId)
        .select({ _id: 1, name: 1, email: 1, activeSubscription: 1 })
        .populate({
          path: "activeSubscription",
          populate: {
            path: "planId",
            select: { _id: 1, name: 1, price: 1, validityMonths: 1, canResell: 1 },
          },
        })
        .lean()
    : null;

  const activeSubscription = (billingUser as any)?.activeSubscription;
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
  const hasLinkedBilling = Boolean(billingUser);

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · My Billing</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Subscription Plans</h1>
            <p className="text-sm text-slate-600">
              {hasLinkedBilling
                ? "Logged-in admin mate linked billing account par current plan ane upgrades manage karo."
                : "User page jevi rite plan select kari direct payment flow use karo."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasLinkedBilling && (
              <Link
                href="/admin/payments"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
              >
                Payments History
              </Link>
            )}
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              ← Back to Users
            </Link>
          </div>
        </div>

        {hasLinkedBilling ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active Billing
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{currentPlanName}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Linked account
                    {" "}
                    <span className="font-semibold text-slate-900">
                      {(billingUser as any)?.name || (billingUser as any)?.email || adminEmail}
                    </span>
                    {" "}
                    mate current active billing.
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
        ) : (
          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white/90 shadow-xl ring-1 ring-amber-100/70 backdrop-blur">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  No Linked Billing
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Billing account unavailable</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Current admin login mate billing user create/query thai shakyo nathi.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Step 1</p>
                <p className="mt-2 text-lg font-bold text-slate-900">Refresh Page</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Step 2</p>
                <p className="mt-2 text-lg font-bold text-slate-900">Retry Payment</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const preview = hasLinkedBilling
              ? calculatePlanBillingPreview({
                  currentSubscription: activeSubscription,
                  targetPlan: plan,
                })
              : {
                  isCurrentPlan: false,
                  payableAmount: Number(plan.price || 0),
                  creditAmount: 0,
                  currentPlanName: null,
                  isUpgrade: false,
                };
            const isCurrentPlan = preview.isCurrentPlan;
            const displayName = getPlanDisplayName(plan);
            const isCustomPlan = isCustomPlanTier(plan);

            return (
              <div
                key={String(plan._id)}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur transition-all hover:border-sky-200 hover:shadow-2xl"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/50 to-white px-6 py-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
                    <span className="text-lg font-bold text-sky-600">
                      {isCustomPlan ? displayName : `₹${formatBillingAmount(Number(plan.price || 0))}`}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-500">
                    {plan.description || "Unlock all advanced analytics."}
                  </p>
                </div>

                <div className="flex-grow space-y-4 px-6 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Users</p>
                      <p className="text-sm font-semibold text-slate-700">{formatPlanLimit(plan.maxUsers)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SEO Reports</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {isCustomPlan ? displayName : formatPlanLimit(plan.maxSeoReports)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Google Ads Accounts</p>
                      <p className="text-sm font-semibold text-slate-700">{formatPlanLimit(plan.maxGoogleAdsAccounts)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reseller</p>
                      <p className="text-sm font-semibold text-slate-700">{plan.canResell ? "Available" : "No"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          {hasLinkedBilling ? (isCurrentPlan ? "Plan Status" : "Billing Preview") : "Billing Status"}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {!hasLinkedBilling
                            ? "Billing account unavailable for direct checkout."
                            : isCurrentPlan
                              ? "This is your current active plan."
                              : isCustomPlan
                                ? "Tell us your report assignment and account volume needs."
                              : preview.payableAmount > 0
                                ? `Upgrade & Pay ₹${formatBillingAmount(preview.payableAmount)} today`
                                : "No Razorpay charge required"}
                        </p>
                      </div>
                      <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        !hasLinkedBilling
                          ? "bg-slate-100 text-slate-700"
                          : isCurrentPlan
                          ? "bg-emerald-50 text-emerald-700"
                          : preview.isUpgrade
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        <Icon
                          icon={
                            !hasLinkedBilling
                              ? "lucide:circle-alert"
                              : isCurrentPlan
                              ? "lucide:check-circle-2"
                              : preview.isUpgrade
                                ? "lucide:trending-up"
                                : "lucide:refresh-cw"
                          }
                          className="h-3.5 w-3.5"
                        />
                        {!hasLinkedBilling ? "Unavailable" : isCurrentPlan ? "Active" : isCustomPlan ? "Own Plan" : preview.isUpgrade ? "Upgrade" : "Switch"}
                      </div>
                    </div>

                    {(!isCurrentPlan || !hasLinkedBilling) && !isCustomPlan && (
                      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Full Price</p>
                          <p className="mt-1 font-bold text-slate-900">₹{formatBillingAmount(Number(plan.price || 0))}</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Unused Credit</p>
                          <p className="mt-1 font-bold text-emerald-700">
                            {hasLinkedBilling ? `₹${formatBillingAmount(preview.creditAmount)}` : "User Based"}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Upgrade & Pay</p>
                          <p className="mt-1 font-bold text-sky-700">
                            {hasLinkedBilling ? `₹${formatBillingAmount(preview.payableAmount)}` : "Next Step"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto px-6 pb-6">
                  <p className="mb-3 text-center text-xs font-medium text-slate-400">
                    {isCustomPlan
                      ? "Need more than 5 SEO reports or reseller onboarding? Send a custom request."
                      : !hasLinkedBilling
                      ? "Billing account available thata direct same-user jevu Razorpay flow chalse."
                      : isCurrentPlan
                        ? "This plan is already active on your linked account."
                        : preview.payableAmount > 0
                          ? `You will pay ₹${formatBillingAmount(preview.payableAmount)} after applying unused credit.`
                          : preview.creditAmount > 0
                            ? "Unused credit fully covers this switch."
                            : "Switch instantly without a Razorpay charge."}
                  </p>
                  {isCustomPlan ? (
                    isCurrentPlan ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400 shadow-sm"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <CustomPlanRequestButton
                        planName={displayName}
                        defaultName={(billingUser as any)?.name || session?.user?.name || ""}
                        defaultEmail={(billingUser as any)?.email || adminEmail}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      />
                    )
                  ) : hasLinkedBilling ? (
                    <PlanCheckoutButton
                      clientId={String((billingUser as any)._id)}
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
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400 shadow-sm"
                    >
                      <Icon icon="lucide:circle-alert" className="h-4 w-4" />
                      Billing Unavailable
                    </button>
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
