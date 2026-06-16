import connectDB from "@/lib/mongodb";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { redirect } from "next/navigation";
import { createClientUserAction } from "../actions";
import { Link } from "@/i18n/routing";
import User from "@/models/User";
import { Icon } from "@/components/ui/icon";
import { formatPlanLimit, hasReachedPlanLimit } from "@/lib/plan-limits";
import NewTeamMemberForm from "./NewTeamMemberForm";
import { getOwnerChannelAssignmentOptions } from "@/lib/channel-assignment-options";

export default async function NewClientUserPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const session = await getAnalyticsSession();

    if (!session?.user) {
        redirect(`/${locale}/login`);
    }

    const { role, id: sessionId } = session.user;
    const isOwner = role === "client" && sessionId === id;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
        redirect(`/${locale}/login`);
    }

    await connectDB();

    // Limit Check
    const currentUser = await User.findById(id).populate({
        path: "activeSubscription",
        populate: { path: "planId" }
    }).lean();

    const plan = (currentUser as any)?.activeSubscription?.planId;
    if (!isAdmin && plan) {
        const userCount = await User.countDocuments({ parent_client_id: id });
        if (hasReachedPlanLimit(userCount, plan.maxUsers)) {
            return (
                <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-md">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Icon icon="lucide:alert-triangle" className="w-10 h-10 text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Limit Reached</h2>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Your current plan (<strong>{plan.name}</strong>) allows for a maximum of <strong>{formatPlanLimit(plan.maxUsers)}</strong> team user(s).
                            You have already reached this limit.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link href={`/analytics/${id}/plans`} className="bg-sky-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-sky-100 hover:bg-sky-700 transition">
                                Upgrade Your Plan
                            </Link>
                            <Link href={`/analytics/${id}/users`} className="text-slate-500 font-semibold hover:text-slate-700">
                                Back to Team
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }
    }

    const targetEmail = (currentUser as any)?.email || session.user.email;
    const { pages, instas, ads, subAccounts, gscSite } = await getOwnerChannelAssignmentOptions({
        ownerId: id,
        ownerEmail: targetEmail,
    });

    return (
        <div className="p-6 lg:p-10 text-slate-800">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Client · Team</p>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Add a New User</h1>
                        <p className="mt-1 text-sm text-slate-600">Invite new users and optionally delegate specific analytics reports.</p>
                    </div>
                    <Link
                        href={`/analytics/${id}/users`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                    >
                        ← Back to Team
                    </Link>
                </div>

                <NewTeamMemberForm
                    clientId={id}
                    pages={pages}
                    instas={instas}
                    ads={ads}
                    subAccounts={subAccounts}
                    gscSite={gscSite}
                    createClientUserAction={createClientUserAction}
                />
            </div>
        </div>
    );
}
