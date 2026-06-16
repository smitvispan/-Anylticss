import Plan from "@/models/Plan";
import User from "@/models/User";
import PlanCheckoutButton from "@/components/subscription/plan-checkout-button";
import { calculatePlanBillingPreview, formatBillingAmount } from "@/lib/subscription-billing";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getAdminOwnerContext } from "@/lib/admin-user-scope";
import { formatPlanLimit } from "@/lib/plan-limits";

type Params = Promise<{ locale: string; id: string }>;

export default async function AdminClientPlansPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const ownerContext = await getAdminOwnerContext();
  const ownerId = ownerContext?.ownerId || null;

  if (!ownerId) {
    notFound();
  }

  const [plans, user] = await Promise.all([
    Plan.find({}).sort({ price: 1 }).lean(),
    User.findOne({ _id: id, parent_client_id: ownerId, role: "user", isAdmin: false })
      .select({ name: 1, email: 1, activeSubscription: 1 })
      .populate({
        path: "activeSubscription",
        populate: {
          path: "planId",
          select: { _id: 1, name: 1, price: 1, validityMonths: 1, canResell: 1 },
        },
      })
      .lean(),
  ]);

  if (!user) {
    notFound();
  }

  const activeSubscription = (user as any)?.activeSubscription;
  const currentPlan = activeSubscription?.planId;
  const currentPlanName = currentPlan?.name || "No Active Plan";
  const currentPlanEndDate = activeSubscription?.endDate
    ? new Date(activeSubscription.endDate)
    : null;
  const remainingDays = currentPlanEndDate
    ? Math.max(
        0,
        Math.ceil((currentPlanEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      )
    : 0;

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · Billing</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">User Subscription Plans</h1>
            <p className="text-sm text-slate-600">
              Manage the active plan, billing credit, and upgrades for
              {" "}
              <span className="font-semibold text-slate-900">{user.name || user.email || "this user"}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/users/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              Edit User
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              ← Back to Users
            </Link>
          </div>
        </div>

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
                  Current active plan for
                  {" "}
                  <span className="font-semibold text-slate-900">{user.name || user.email || "this user"}</span>.
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const preview = calculatePlanBillingPreview({
              currentSubscription: activeSubscription,
              targetPlan: plan,
            });
            const isCurrentPlan = preview.isCurrentPlan;

            return (
              <div
                key={String(plan._id)}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur transition-all hover:border-sky-200 hover:shadow-2xl"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/50 to-white px-6 py-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
                    <span className="text-lg font-bold text-sky-600">₹{formatBillingAmount(Number(plan.price || 0))}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-500">
                    {plan.description || "Unlock all advanced analytics."}
                  </p>
                </div>

                <div className="flex-grow space-y-4 px-6 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Members</p>
                      <p className="text-sm font-semibold text-slate-700">{formatPlanLimit(plan.maxUsers)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FB Pages</p>
                      <p className="text-sm font-semibold text-slate-700">{plan.maxFacebookPages}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IG Accounts</p>
                      <p className="text-sm font-semibold text-slate-700">{plan.maxInstagramAccounts}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SEO Properties</p>
                      <p className="text-sm font-semibold text-slate-700">{plan.maxSeoReports || 0}</p>
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
                            ? "This is the user's current active plan."
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
                        {isCurrentPlan ? "Active" : preview.isUpgrade ? "Upgrade" : "Switch"}
                      </div>
                    </div>

                    {!isCurrentPlan && (
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

                <div className="mt-auto px-6 pb-6">
                  <p className="mb-3 text-center text-xs font-medium text-slate-400">
                    {isCurrentPlan
                      ? "This plan is already active for this user."
                      : preview.payableAmount > 0
                        ? `You will pay ₹${formatBillingAmount(preview.payableAmount)} after applying unused credit.`
                        : preview.creditAmount > 0
                          ? "Unused credit fully covers this switch."
                          : "Switch instantly without a Razorpay charge."}
                  </p>
                  <PlanCheckoutButton
                    clientId={String(user._id)}
                    preview={{
                      isCurrentPlan,
                      payableAmount: preview.payableAmount,
                      creditAmount: preview.creditAmount,
                      currentPlanName: preview.currentPlanName,
                    }}
                    plan={{
                      _id: String(plan._id),
                      name: plan.name,
                      price: Number(plan.price || 0),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
