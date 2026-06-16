import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import "@/models/Plan";
import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { ensureAdminBillingUser } from "@/lib/admin-billing-user";
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

function buildHref(params: URLSearchParams) {
  const query = params.toString();
  return `/admin/payments${query ? `?${query}` : ""}`;
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

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;

  const q = getSingleParam(sp.q).trim();
  const status = getSingleParam(sp.status, "all");
  const page = Math.max(1, Number.parseInt(getSingleParam(sp.page, "1"), 10) || 1);
  const adminEmail = session?.user?.email?.trim() || "";

  await connectDB();

  const billingUserId = await ensureAdminBillingUser({
    email: adminEmail,
    name: session?.user?.name || null,
  });
  const billingUser = billingUserId
    ? await User.findById(billingUserId).select({ _id: 1, name: 1, email: 1 }).lean()
    : null;

  if (!billingUser) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · Payments</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Payments History</h1>
              <p className="text-sm text-slate-600">
                Linked billing account vagar payment history dekhadi shakay nahi.
              </p>
            </div>
            <Link
              href="/admin/plans"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              Open Billing
            </Link>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-white/90 p-8 shadow-xl ring-1 ring-amber-100/70">
            <p className="text-lg font-semibold text-slate-900">No linked billing account</p>
            <p className="mt-2 text-sm text-slate-600">
              Current admin login
              {" "}
              <span className="font-semibold text-slate-900">{adminEmail || "unknown email"}</span>
              {" "}
              sathe matching user billing record nathi malyo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const subscriptionsRaw = await Subscription.find({
    userId: billingUser._id,
    status: { $ne: "pending" },
  })
    .populate({ path: "userId", select: { _id: 1, name: 1, email: 1, role: 1 } })
    .populate({ path: "planId", select: { _id: 1, name: 1, price: 1 } })
    .populate({ path: "previousPlanId", select: { _id: 1, name: 1, price: 1 } })
    .sort({ createdAt: -1 })
    .lean();

  const normalizedQuery = q.toLowerCase();

  const rows = subscriptionsRaw
    .map((subscription: any) => {
      const paymentMode = getSubscriptionPaymentModeLabel(getSubscriptionPaymentMode(subscription));
      const userName = subscription.userId?.name || "—";
      const userEmail = subscription.userId?.email || "—";
      const currentPlanName = subscription.planId?.name || "—";
      const previousPlanName = subscription.previousPlanId?.name || "—";
      const recordSource = subscription.recordSource || null;
      const isLegacy = recordSource !== BILLING_RECORD_SOURCE;
      const actionHref = "/admin/plans";

      return {
        subscription,
        paymentMode,
        userName,
        userEmail,
        currentPlanName,
        previousPlanName,
        isLegacy,
        actionHref,
      };
    })
    .filter((row) => {
      if (status !== "all" && row.subscription.status !== status) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        row.userName,
        row.userEmail,
        row.subscription.orderId || "",
        row.subscription.paymentId || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = rows.slice(startIndex, startIndex + PAGE_SIZE);

  const prevParams = new URLSearchParams();
  if (q) prevParams.set("q", q);
  if (status !== "all") prevParams.set("status", status);

  const prevHref = currentPage > 1
    ? (() => {
        const params = new URLSearchParams(prevParams);
        params.set("page", String(currentPage - 1));
        return buildHref(params);
      })()
    : null;

  const nextHref = currentPage < totalPages
    ? (() => {
        const params = new URLSearchParams(prevParams);
        params.set("page", String(currentPage + 1));
        return buildHref(params);
      })()
    : null;

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · Payments</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Payments History</h1>
            <p className="text-sm text-slate-600">
              Logged-in admin na linked billing account ni payment history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {(billingUser as any).name || (billingUser as any).email}
            </span>
            <Link
              href="/admin/plans"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
            >
              Open Billing
            </Link>
          </div>
        </div>

        <form
          method="GET"
          className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg ring-1 ring-slate-100/60 backdrop-blur md:grid-cols-[2fr_1fr_auto]"
        >
          <div className="space-y-2">
            <label htmlFor="q" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="User, email, order ID, payment ID"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="canceled">Canceled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600"
            >
              Filter
            </button>
            <Link
              href="/admin/payments"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
            >
              Reset
            </Link>
          </div>
        </form>

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
                      No payment rows found for the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(({ subscription, paymentMode, userName, userEmail, currentPlanName, previousPlanName, isLegacy, actionHref }: any) => (
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
                          <span className="font-semibold text-slate-900">{userName}</span>
                          <span className="text-xs text-slate-500">{userEmail}</span>
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
                        {actionHref ? (
                          <Link
                            href={actionHref}
                            className="inline-flex items-center rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50"
                          >
                            Open Billing
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-3">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
                  ← Previous
                </span>
              )}

              {nextHref ? (
                <Link
                  href={nextHref}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                >
                  Next →
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
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
