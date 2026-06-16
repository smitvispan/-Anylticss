import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { getClientSession } from "@/lib/client-auth-server";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type Params = Promise<{ id: string; locale: string }>;

export default async function SubClientsPage({ params }: { params: Params }) {
    const { id: clientId, locale } = await params;
    const session = await getClientSession("client");

    // Security check: ensure the session client matches the ID in URL
    if (!session || session.user.id !== clientId || !session.user.canResell) {
        redirect(`/${locale}/login`);
    }

    await connectDB();
    const subClients = await User.find({ parent_client_id: clientId, role: 'client' })
        .populate({
            path: 'activeSubscription',
            populate: { path: 'planId' }
        })
        .sort({ createdAt: -1 })
        .lean();

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sub-Clients Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your reseller accounts and their subscription plans.</p>
                </div>
                <Link href={`/${locale}/analytics/${clientId}/sub-clients/new`}>
                    <Button className="bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all hover:-translate-y-0.5">
                        <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                        Add New Client
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subClients.map((client: any) => (
                    <Card key={client._id.toString()} className="border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="bg-slate-50/50 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold uppercase">
                                    {client.name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <CardTitle className="text-base truncate max-w-[180px]">{client.name}</CardTitle>
                                    <p className="text-xs text-slate-500 truncate max-w-[180px]">{client.email}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Active Plan:</span>
                                    <span className="font-semibold text-slate-900 bg-sky-50 px-2 py-0.5 rounded text-xs">
                                        {client.activeSubscription?.planId?.name || 'No Plan'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Expiry:</span>
                                    <span className={client.activeSubscription?.endDate && new Date(client.activeSubscription.endDate) < new Date() ? 'text-rose-600 font-medium' : 'text-slate-700 font-medium'}>
                                        {client.activeSubscription?.endDate ? new Date(client.activeSubscription.endDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex gap-2">
                                    <Link href={`/${locale}/analytics/${clientId}/sub-clients/${client._id}/edit`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full text-xs">Manage Account</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {subClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <Icon icon="lucide:users" className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No sub-clients yet</h3>
                    <p className="text-slate-500 text-sm mt-1">Start reselling by adding your first client.</p>
                    <Link href={`/${locale}/analytics/${clientId}/sub-clients/new`} className="mt-6">
                        <Button variant="outline">Create Client Account</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
