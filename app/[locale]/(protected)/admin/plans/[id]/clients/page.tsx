import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import PlanCheckoutButton from "@/components/subscription/plan-checkout-button";
import {
    calculatePlanBillingPreview,
    formatBillingAmount,
} from "@/lib/subscription-billing";

type PlanClientsPageProps = {
    params: Promise<{ id: string; locale: string }>;
};

export default async function PlanClientsPage({ params }: PlanClientsPageProps) {
    const { id } = await params;
    await connectDB();

    const plan = await Plan.findById(id).lean();
    if (!plan) notFound();

    const [subscriptions, users] = await Promise.all([
        Subscription.find({ planId: id, status: "active" }).select("userId").lean(),
        User.find({ isAdmin: false })
            .select({
                name: 1,
                email: 1,
                mainPage: 1,
                mainInstagram: 1,
                activeSubscription: 1,
                createdAt: 1,
            })
            .populate({
                path: "activeSubscription",
                populate: {
                    path: "planId",
                    select: { _id: 1, name: 1, price: 1, validityMonths: 1, canResell: 1 },
                },
            })
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    const pageMap = new Map();
    const instaMap = new Map();

    if (users.length > 0) {
        const pageIds = users.map(u => u.mainPage).filter(Boolean);
        const instaIds = users.map(u => u.mainInstagram).filter(Boolean);

        const [pages, instas] = await Promise.all([
            pageIds.length ? Page.find({ _id: { $in: pageIds } }).lean() : [],
            instaIds.length ? InstagramAccount.find({ _id: { $in: instaIds } }).lean() : [],
        ]);

        pages.forEach(p => pageMap.set(String(p._id), p.name));
        instas.forEach(i => instaMap.set(String(i._id), i.username));
    }
    const activeSubscribers = subscriptions.length;

    return (
        <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
            <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · Subscriptions · {plan.name}</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Purchase {plan.name} For a User</h1>
                        <p className="text-sm text-slate-600">
                            Choose a user below and open the direct plan purchase flow with credit adjustment.
                        </p>
                    </div>
                    <Link
                        href="/admin/plans"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
                    >
                        ← Back to Plans
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-lg ring-1 ring-slate-100/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Selected Plan</p>
                        <p className="mt-2 text-xl font-bold text-slate-900">{plan.name}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-lg ring-1 ring-slate-100/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Plan Price</p>
                        <p className="mt-2 text-xl font-bold text-sky-700">₹{formatBillingAmount(Number(plan.price || 0))}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-lg ring-1 ring-slate-100/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current Subscribers</p>
                        <p className="mt-2 text-xl font-bold text-slate-900">{activeSubscribers}</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur">
                    <div className="overflow-hidden">
                        <table className="w-full table-fixed text-sm">
                            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="py-3 px-4 text-left font-semibold">User</th>
                                    <th className="py-3 px-4 text-left font-semibold">Current Plan</th>
                                    <th className="py-3 px-4 text-left font-semibold">Billing Preview</th>
                                    <th className="py-3 px-4 text-left font-semibold">Main Page</th>
                                    <th className="py-3 px-4 text-left font-semibold">Main Instagram</th>
                                    <th className="py-3 px-4 text-left font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 px-4 text-center text-slate-500">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u: any) => {
                                        const activeSubscription = u.activeSubscription;
                                        const preview = calculatePlanBillingPreview({
                                            currentSubscription: activeSubscription,
                                            targetPlan: plan,
                                        });
                                        const currentPlanName = activeSubscription?.planId?.name || "No Active Plan";

                                        return (
                                        <tr key={String(u._id)} className="border-b border-slate-100/80 bg-white transition hover:bg-sky-50/60 last:border-0">
                                            <td className="py-4 px-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{u.name || "—"}</span>
                                                    <span className="text-xs text-slate-500">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{currentPlanName}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {activeSubscription?.endDate
                                                            ? `Valid till ${new Date(activeSubscription.endDate).toLocaleDateString()}`
                                                            : "No active validity"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 align-top">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-slate-900">
                                                        {preview.isCurrentPlan
                                                            ? "Already active on this user"
                                                            : preview.payableAmount > 0
                                                                ? `Pay ₹${formatBillingAmount(preview.payableAmount)} now`
                                                                : "No payment required"}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {preview.isCurrentPlan
                                                            ? "This user is already on the selected plan."
                                                            : preview.creditAmount > 0
                                                                ? `Unused credit ₹${formatBillingAmount(preview.creditAmount)} will be adjusted automatically.`
                                                                : `Full plan price ₹${formatBillingAmount(Number(plan.price || 0))} will apply.`}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 align-top">
                                                <span className="text-xs font-medium text-slate-600 truncate block">
                                                    {pageMap.get(String(u.mainPage)) || "—"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 align-top">
                                                <span className="text-xs font-medium text-slate-600 truncate block">
                                                    {instaMap.get(String(u.mainInstagram)) || "—"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 align-top">
                                                <div className="ml-auto flex max-w-[220px] flex-col gap-2">
                                                    <PlanCheckoutButton
                                                        clientId={String(u._id)}
                                                        preview={{
                                                            isCurrentPlan: preview.isCurrentPlan,
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
                                                    <Link
                                                        href={`/admin/users/${u._id}/plans`}
                                                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                                                    >
                                                        Open Billing
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
