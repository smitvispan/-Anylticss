"use server";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Plan from "@/models/Plan";
import { activateSubscriptionForUser } from "@/lib/subscription-billing";
import Subscription from "@/models/Subscription";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { checkSubscriptionLimit } from "@/lib/subscription-utils";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";

function val(v: FormDataEntryValue | null): string | null {
    const s = v?.toString().trim();
    return s ? s : null;
}

function getBillingMeta(formData: FormData) {
    return {
        paymentId: formData.get("billingPaymentId")?.toString().trim() || null,
        orderId: formData.get("billingOrderId")?.toString().trim() || null,
        amountPaid: Number(formData.get("billingAmountPaid")?.toString() || 0),
        creditApplied: Number(formData.get("billingCreditApplied")?.toString() || 0),
    };
}

export async function createSubClientAction(formData: FormData): Promise<void> {
    const session = await getAnalyticsSession();
    if (!session || (session.user.role !== "client" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Reseller or Admin access required.");
    }

    // We expect the clientId to be in the form (as a hidden input), otherwise fallback to session user if they are a client
    const clientId = session.user.role === "admin"
        ? formData.get("clientId")?.toString()
        : session.user.id;

    if (!clientId) throw new Error("Client ID is required");

    const name = formData.get("name")?.toString() ?? null;
    const email = formData.get("email")?.toString() ?? null;
    const password = formData.get("password")?.toString() ?? null;
    const planId = formData.get("planId")?.toString() || null;
    const billing = getBillingMeta(formData);

    try {
        await connectDB();

        // Check Reseller Limit for Sub-Clients against the actual Reseller (clientId)
        await checkSubscriptionLimit(clientId, 'subClients');

        const newClient = await User.create({
            name,
            email,
            password,
            isAdmin: false,
            role: "client",
            parent_client_id: clientId,
        });

        if (planId) {
            const plan = await Plan.findById(planId);
            if (plan) {
                await activateSubscriptionForUser({
                    userId: String(newClient._id),
                    plan,
                    amountPaid: billing.amountPaid,
                    creditApplied: billing.creditApplied,
                    paymentId: billing.paymentId,
                    orderId: billing.orderId,
                });
            }
        }

        revalidatePath(`/en/analytics/${clientId}/sub-clients`);
        redirect(`/en/analytics/${clientId}/sub-clients?created=1`);
    } catch (err: any) {
        if (err?.code === 11000 || err?.code === "P2002") {
            redirect(`/en/analytics/${clientId}/sub-clients/new?error=email_exists`);
        }
        redirect(`/en/analytics/${clientId}/sub-clients/new?error=${encodeURIComponent(err?.message ?? "create_failed")}`);
    }
}

export async function updateSubClientAction(formData: FormData): Promise<void> {
    const session = await getAnalyticsSession();
    if (!session || (session.user.role !== "client" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const clientId = session.user.role === "admin"
        ? formData.get("clientId")?.toString()
        : session.user.id;

    if (!clientId) throw new Error("Client ID is required");

    const id = formData.get("id")?.toString();
    if (!id) notFound();

    const planId = formData.get("planId")?.toString() || null;
    const billing = getBillingMeta(formData);

    const data = {
        name: val(formData.get("name")),
        email: val(formData.get("email")),
        password: val(formData.get("password")),
    };

    if (!data.password) {
        // @ts-expect-error – delete for update
        delete data.password;
    }

    try {
        await connectDB();
        const existing = await User.findOne({ _id: id, parent_client_id: clientId, role: 'client' })
            .select({ _id: 1, activeSubscription: 1, name: 1, email: 1, password: 1 })
            .populate({
                path: "activeSubscription",
                populate: {
                    path: "planId",
                    select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                },
            });
        if (!existing) notFound();

        if (data.name) existing.name = data.name;
        if (data.email) existing.email = data.email;
        if (data.password) existing.password = data.password;

        await existing.save();

        const currentPlanId = String((existing as any)?.activeSubscription?.planId?._id || "");

        if (planId && planId !== currentPlanId) {
            const plan = await Plan.findById(planId);
            if (plan) {
                await activateSubscriptionForUser({
                    userId: String(existing._id),
                    plan,
                    currentSubscription: (existing as any).activeSubscription,
                    amountPaid: billing.amountPaid,
                    creditApplied: billing.creditApplied,
                    paymentId: billing.paymentId,
                    orderId: billing.orderId,
                });
            }
        }

        revalidatePath(`/en/analytics/${clientId}/sub-clients`);
        redirect(`/en/analytics/${clientId}/sub-clients?updated=1`);
    } catch (err: any) {
        redirect(`/en/analytics/${clientId}/sub-clients/${id}/edit?error=${encodeURIComponent(err?.message ?? "update_failed")}`);
    }
}

export async function deleteSubClientAction(formData: FormData): Promise<void> {
    const session = await getAnalyticsSession();
    if (!session || (session.user.role !== "client" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const clientId = session.user.role === "admin"
        ? formData.get("clientId")?.toString()
        : session.user.id;

    if (!clientId) throw new Error("Client ID is required");

    const id = formData.get("id")?.toString();
    if (!id) notFound();

    await connectDB();
    await User.findOneAndDelete({ _id: id, parent_client_id: clientId, role: 'client' });
    await Subscription.deleteMany({ userId: id });

    revalidatePath(`/en/analytics/${clientId}/sub-clients`);
    redirect(`/en/analytics/${clientId}/sub-clients?deleted=1`);
}
