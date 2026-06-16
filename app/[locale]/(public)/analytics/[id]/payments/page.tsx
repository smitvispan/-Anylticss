import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import "@/models/Plan";
import { Link } from "@/i18n/routing";
import { notFound, redirect } from "next/navigation";
import {
  BILLING_RECORD_SOURCE,
  formatBillingAmount,
  getSubscriptionGrossBilled,
  getSubscriptionPaymentMode,
  getSubscriptionPaymentModeLabel,
} from "@/lib/subscription-billing";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(value: string | string[] | undefined, fallback = "") {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || fallback : fallback;
}

function buildHref(id: string, page: number) {
  return `/analytics/${id}/payments${page > 1 ? `?page=${page}` : ""}`;
}

function modeBadgeClasses(mode: string) {
  switch (mode) {
    case "Razorpay":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Credit Only":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export default async function ClientPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: SearchParams;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(getSingleParam(sp.page, "1"), 10) || 1);

  await connectDB();

  const user = await User.findById(id)
    .select({ _id: 1, name: 1, email: 1, role: 1, parent_client_id: 1 })
    .lean();

  if (!user) {
    notFound();
  }

  if (user.role === "user" && user.parent_client_id) {
    redirect(`/${locale}/analytics/${String(user.parent_client_id)}/payments`);
  }

  const subscriptionsRaw = await Subscription.find({
    userId: user._id,
    status: { $ne: "pending" },
  })
    .populate({ path: "planId", select: { _id: 1, name: 1, price: 1 } })
    .populate({ path: "previousPlanId", select: { _id: 1, name: 1, price: 1 } })
    .sort({ createdAt: -1 })
    .lean();

  const rows = subscriptionsRaw.map((subscription: any) => {
    const paymentMode = getSubscriptionPaymentModeLabel(getSubscriptionPaymentMode(subscription));
    const currentPlanName = subscription.planId?.name || "—";
    const previousPlanName = subscription.previousPlanId?.name || "—";
    const recordSource = subscription.recordSource || null;
    const isLegacy = recordSource !== BILLING_RECORD_SOURCE;

    return {
      subscription,
      paymentMode,
      currentPlanName,
      previousPlanName,
      isLegacy,
      actionHref: `/analytics/${id}/plans`,
    };
  });

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = rows.slice(startIndex, startIndex + PAGE_SIZE);
  const prevHref = currentPage > 1 ? buildHref(id, currentPage - 1) : null;
  const nextHref = currentPage < totalPages ? buildHref(id, currentPage + 1) : null;

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Client · Payments</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Payments History</h1>
            <p className="text-sm text-slate-600">
              Current client workspace ni billing ane upgrade payment history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {user.name || user.email || "Client Billing"}
            </span>
            <Link
              href={`/analytics/${id}/plans`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              Open Billing
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Orders</p>
              <p className="text-sm text-slate-600">
                Showing {totalRows === 0 ? 0 : startIndex + 1}-
                {Math.min(startIndex + PAGE_SIZE, totalRows)} of {totalRows} rows
              </p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {totalRows} ledger rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1650px] text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Current Plan</th>
                  <th className="px-4 py-3 text-left font-semibold">Previous Plan</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment Mode</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount Paid</th>
                  <th className="px-4 py-3 text-left font-semibold">Credit Applied</th>
                  <th className="px-4 py-3 text-left font-semibold">Net Billed / Plan Price</th>
                  <th className="px-4 py-3 text-left font-semibold">Order ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Validity</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-slate-500">
                      No payment rows found for this client workspace.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(({ subscription, paymentMode, currentPlanName, previousPlanName, isLegacy, actionHref }: any) => (
                    <tr
                      key={String(subscription._id)}
                      className="border-b border-slate-100/80 bg-white transition hover:bg-sky-50/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString() : "—"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {subscription.createdAt ? new Date(subscription.createdAt).toLocaleTimeString() : "—"}
                          </span>
                          {isLegacy && (
                            <span className="mt-2 inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                              Legacy
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{user.name || "—"}</span>
                          <span className="text-xs text-slate-500">{user.email || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{currentPlanName}</td>
                      <td className="px-4 py-3 text-slate-700">{previousPlanName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${modeBadgeClasses(paymentMode)}`}>
                          {paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">₹{formatBillingAmount(Number(subscription.amountPaid || 0))}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">₹{formatBillingAmount(Number(subscription.creditApplied || 0))}</td>
                      <td className="px-4 py-3 text-slate-700">
                        ₹{formatBillingAmount(getSubscriptionGrossBilled(subscription))} / ₹
                        {formatBillingAmount(Number(subscription.planPrice || subscription.planId?.price || 0))}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{subscription.orderId || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{subscription.paymentId || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          {subscription.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex flex-col">
                          <span>{subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : "—"}</span>
                          <span className="text-xs text-slate-500">
                            to {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={actionHref}
                          className="inline-flex items-center rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50"
                        >
                          Open Billing
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-3">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
                  ← Previous
                </span>
              )}

              {nextHref ? (
                <Link
                  href={nextHref}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                >
                  Next →
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
                  Next →
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
