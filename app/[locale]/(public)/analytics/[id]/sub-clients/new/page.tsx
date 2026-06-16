import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import { getClientSession } from "@/lib/client-auth-server";
import { createSubClientAction } from "../actions";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { formatPlanLimit } from "@/lib/plan-limits";

type Params = Promise<{ id: string; locale: string }>;

export default async function NewSubClientPage({ params }: { params: Params }) {
    const { id: clientId, locale } = await params;
    const session = await getClientSession("client");

    if (!session || session.user.id !== clientId || !session.user.canResell) {
        redirect(`/${locale}/login`);
    }

    await connectDB();
    const plans = await Plan.find({ canResell: false }).sort({ price: 1 }).lean();

    const inputClass =
        "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400";
    const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

    return (
        <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Add New Sub-Client</h1>
                        <p className="text-slate-500 text-sm mt-1">Create a new client account under your reseller profile.</p>
                    </div>
                    <Link href={`/${locale}/analytics/${clientId}/sub-clients`} className="text-sm text-sky-600 font-medium hover:underline">
                        ← Back to List
                    </Link>
                </div>

                <form action={createSubClientAction} className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className={labelClass}>Client Name</label>
                            <input id="name" name="name" className={inputClass} placeholder="Company or Individual Name" required />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className={labelClass}>Client Email</label>
                            <input id="email" type="email" name="email" className={inputClass} placeholder="client@example.com" required />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className={labelClass}>Temporary Password</label>
                            <input id="password" type="password" name="password" className={inputClass} placeholder="Set a temporary password" required />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="planId" className={labelClass}>Assign Plan</label>
                            <select id="planId" name="planId" className={inputClass} required>
                                <option value="">Select a plan for your client</option>
                                {plans.map((p: any) => (
                                    <option key={p._id.toString()} value={p._id.toString()}>
                                        {p.name} - Limit: {formatPlanLimit(p.maxUsers)} Users
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 italic">Sub-clients are bound by the limits of their assigned plan.</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <Link href={`/${locale}/analytics/${clientId}/sub-clients`}>
                            <button type="button" className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">Cancel</button>
                        </Link>
                        <button type="submit" className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-sky-100 hover:bg-sky-700 transition">
                            Create Client
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
