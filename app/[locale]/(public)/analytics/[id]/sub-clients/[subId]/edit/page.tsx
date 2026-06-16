import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Plan from "@/models/Plan";
import { getClientSession } from "@/lib/client-auth-server";
import { notFound, redirect } from "next/navigation";
import { updateSubClientAction, deleteSubClientAction } from "../../actions";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import { Link } from "@/i18n/routing";
import { formatPlanLimit } from "@/lib/plan-limits";

type Params = Promise<{ id: string; subId: string; locale: string }>;

export default async function EditSubClientPage({ params }: { params: Params }) {
    const { id: clientId, subId, locale } = await params;
    const session = await getClientSession("client");

    if (!session || session.user.id !== clientId || !session.user.canResell) {
        redirect(`/${locale}/login`);
    }

    await connectDB();
    const subClient = await User.findOne({ _id: subId, parent_client_id: clientId, role: 'client' })
        .populate({
            path: "activeSubscription",
            populate: {
                path: "planId",
                select: { _id: 1, name: 1 },
            },
        })
        .lean();
    if (!subClient) notFound();
    const currentPlanId = String((subClient as any)?.activeSubscription?.planId?._id || "");

    const plans = await Plan.find({ canResell: false }).sort({ price: 1 }).lean();

    const inputClass =
        "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400";
    const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

    return (
        <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Sub-Client</h1>
                        <p className="text-slate-500 text-sm mt-1">Update account details or change plans for your client.</p>
                    </div>
                    <Link href={`/${locale}/analytics/${clientId}/sub-clients`} className="text-sm text-sky-600 font-medium hover:underline">
                        ← Back to List
                    </Link>
                </div>

                <form action={updateSubClientAction} className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
                    <input type="hidden" name="id" value={subClient._id.toString()} />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className={labelClass}>Client Name</label>
                            <input id="name" name="name" className={inputClass} defaultValue={subClient.name || ''} required />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className={labelClass}>Client Email</label>
                            <input id="email" type="email" name="email" className={inputClass} defaultValue={subClient.email || ''} required />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="planId" className={labelClass}>Switch Plan</label>
                            <select id="planId" name="planId" defaultValue={currentPlanId} className={inputClass} required>
                                <option value="">Select a plan</option>
                                {plans.map((p: any) => (
                                    <option key={p._id.toString()} value={p._id.toString()}>
                                        {p.name} - Limit: {formatPlanLimit(p.maxUsers)} Users
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className={labelClass}>Reset Password</label>
                            <input id="password" type="password" name="password" className={inputClass} placeholder="Leave blank to keep current" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="submit" className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-sky-100 hover:bg-sky-700 transition">
                            Save Changes
                        </button>
                    </div>
                </form>

                <div className="mt-8 border-t border-slate-200 pt-8 flex justify-center">
                    <DeleteUserButton id={subClient._id.toString()} serverAction={deleteSubClientAction} />
                </div>
            </div>
        </div>
    );
}
