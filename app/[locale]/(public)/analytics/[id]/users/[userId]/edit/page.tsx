import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { redirect, notFound } from "next/navigation";
import { updateClientUserAction } from "../../actions";
import { Link } from "@/i18n/routing";
import EditTeamMemberForm from "./EditTeamMemberForm";
import { getOwnerChannelAssignmentOptions } from "@/lib/channel-assignment-options";

export default async function EditClientUserPage({
    params,
}: {
    params: Promise<{ locale: string; id: string; userId: string }>;
}) {
    const { locale, id, userId } = await params;
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

    // Fetch user and check ownership
    const userToEditRaw = await User.findOne({ _id: userId, parent_client_id: id })
        .populate("activeSubscription")
        .lean();
    if (!userToEditRaw) notFound();

    const parentClient = await User.findById(id).lean();
    const targetEmail = parentClient?.email || session.user.email;
    const { pages, instas, ads, subAccounts, gscSite } = await getOwnerChannelAssignmentOptions({
        ownerId: id,
        ownerEmail: targetEmail,
    });

    // Serialization fix for Client Components
    const userToEdit = JSON.parse(JSON.stringify(userToEditRaw));

    return (
        <div className="p-6 lg:p-10 text-slate-800">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Client · Team</p>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Edit User</h1>
                        <p className="mt-1 text-sm text-slate-600">Modify user details and analytics report access.</p>
                    </div>
                    <Link
                        href={`/analytics/${id}/users`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                    >
                        ← Back to Team
                    </Link>
                </div>

                <EditTeamMemberForm
                    userId={userId}
                    clientId={id}
                    userToEdit={userToEdit}
                    pages={pages}
                    instas={instas}
                    ads={ads}
                    subAccounts={subAccounts}
                    gscSite={gscSite}
                    updateClientUserAction={updateClientUserAction}
                />
            </div>
        </div>
    );
}
