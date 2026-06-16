import User from "@/models/User";
import { createUserAction } from "../actions";
import { Link } from "@/i18n/routing";
import { Icon } from "@/components/ui/icon";
import { getAdminOwnerContext } from "@/lib/admin-user-scope";
import { formatPlanLimit, formatPlanSeatUsage, hasReachedPlanLimit } from "@/lib/plan-limits";
import NewClientForm from "./NewClientForm";
import { getOwnerChannelAssignmentOptions } from "@/lib/channel-assignment-options";

function isSubscriptionActive(subscription?: {
  status?: string | null;
  endDate?: string | Date | null;
  planId?: unknown;
} | null) {
  if (!subscription?.planId || subscription.status !== "active" || !subscription.endDate) {
    return false;
  }

  const endDate = new Date(subscription.endDate);
  return !Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now();
}

export default async function NewUserPage() {
  const ownerContext = await getAdminOwnerContext();
  const ownerId = ownerContext?.ownerId || null;

  const ownerRaw = ownerId
    ? await User.findById(ownerId)
        .select({ _id: 1, name: 1, email: 1, activeSubscription: 1 })
        .populate({
          path: "activeSubscription",
          populate: {
            path: "planId",
            select: { _id: 1, name: 1, maxUsers: 1 },
          },
        })
        .lean()
    : null;

  const ownerSubscription = (ownerRaw as any)?.activeSubscription || null;
  const currentPlan = ownerSubscription?.planId || null;
  const currentPlanName = currentPlan?.name || "No active plan";
  const seatLimit = currentPlan?.maxUsers;
  const seatLimitLabel = formatPlanLimit(seatLimit);
  const hasActivePlan = isSubscriptionActive(ownerSubscription);
  const userCount = ownerId
    ? await User.countDocuments({ parent_client_id: ownerId, role: "user", isAdmin: false })
    : 0;

  if (!hasActivePlan || hasReachedPlanLimit(userCount, seatLimit)) {
    const title = hasActivePlan ? "User limit reached" : "Select a subscription plan first";
    const description = hasActivePlan
      ? `Your ${currentPlanName} plan allows a maximum of ${seatLimitLabel} user${seatLimitLabel === "1" ? "" : "s"}. You have already created ${userCount} user${userCount === 1 ? "" : "s"}.`
      : "An active subscription plan is required before you can create a user.";

    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-6 lg:py-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · Users</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a new user</h1>
              <p className="mt-1 text-sm text-slate-600">A new user can only be created when seats are available on your current plan.</p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              ← Back to Users
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white/90 shadow-xl ring-1 ring-amber-100/70">
            <div className="border-b border-amber-100 bg-amber-50/70 px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                  <Icon icon="lucide:triangle-alert" className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Upgrade Needed</p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">{title}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current Plan</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{currentPlanName}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">User Seats</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {hasActivePlan ? formatPlanSeatUsage(userCount, seatLimit) : "0 / 0"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 px-6 py-5">
              <Link
                href="/admin/plans"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Icon icon="lucide:arrow-up-right" className="h-4 w-4" />
                {hasActivePlan ? "Upgrade Subscription" : "Open Subscription Plans"}
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ownerEmail = (ownerRaw as any)?.email || ownerContext?.adminEmail || "";
  const { pages, instas, ads, subAccounts, gscSite } = await getOwnerChannelAssignmentOptions({
    ownerId,
    ownerEmail,
  });

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-6 lg:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · Users</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a new user</h1>
            <p className="mt-1 text-sm text-slate-600">
              Current plan
              {" "}
              <span className="font-semibold text-slate-900">{currentPlanName}</span>
              {" "}
              sathe {formatPlanSeatUsage(userCount, seatLimit)} seats use thai gaya che.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
          >
            ← Back to Users
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{pages.length}</p>
            <p className="mt-1 text-slate-500">Pages available</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{instas.length}</p>
            <p className="mt-1 text-slate-500">Instagram profiles</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{ads.length}</p>
            <p className="mt-1 text-slate-500">Ad accounts</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{subAccounts.length}</p>
            <p className="mt-1 text-slate-500">Google Ads accounts</p>
          </div>
        </div>

        <NewClientForm
          pages={pages}
          instas={instas}
          ads={ads}
          subAccounts={subAccounts}
          gscSite={gscSite}
          createUserAction={createUserAction}
        />
      </div>
    </div>
  );
}
