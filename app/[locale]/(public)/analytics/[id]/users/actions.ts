"use server";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { checkSubscriptionLimit } from "@/lib/subscription-utils";
import { redirect } from "next/navigation";

export async function createClientUserAction(formData: FormData): Promise<void> {
    const session = await getAnalyticsSession();
    if (!session || (session.user.role !== "client" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const clientId = session.user.role === "admin"
        ? formData.get("clientId")?.toString()
        : session.user.id;

    if (!clientId) throw new Error("Client ID is required");

    const name = formData.get("name")?.toString() ?? null;
    const email = formData.get("email")?.toString() ?? null;
    const password = formData.get("password")?.toString() ?? null;

    const mainPage = formData.get("mainPage")?.toString() || null;
    const mainInstagram = formData.get("mainInstagram")?.toString() || null;
    const mainAd = formData.get("mainAd")?.toString() || null;
    const mainGoogleAd = formData.get("mainGoogleAd")?.toString() || null;
    const mainSEOsites = formData.get("mainSEOsites")?.toString() || null;

    try {
        await connectDB();

        // Enforce Subscription Limit against the Client, not the Admin
        await checkSubscriptionLimit(clientId, 'users');

        await User.create({
            name,
            email,
            password,
            isAdmin: false,
            role: "user",
            parent_client_id: clientId,
            mainPage,
            mainInstagram,
            mainAd,
            mainGoogleAd,
            mainSEOsites,
            googleSearchConsoleAccounts: mainSEOsites ? [mainSEOsites] : [],
            connectAll: false,
        });

        redirect(`/en/analytics/${clientId}/users?created=1`);
    } catch (err: any) {
        if (err.message && err.message.includes("NEXT_REDIRECT")) throw err;
        if (err?.code === 11000 || err?.code === "P2002") {
            redirect(`/en/analytics/${clientId}/users/new?error=email_exists`);
        }
        redirect(`/en/analytics/${clientId}/users/new?error=${encodeURIComponent(err?.message ?? "create_failed")}`);
    }
}

export async function updateClientUserAction(formData: FormData): Promise<void> {
    const session = await getAnalyticsSession();
    if (!session || (session.user.role !== "client" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const clientId = session.user.role === "admin"
        ? formData.get("clientId")?.toString()
        : session.user.id;

    if (!clientId) throw new Error("Client ID is required");

    const userId = formData.get("userId")?.toString();
    const name = formData.get("name")?.toString() ?? null;
    const email = formData.get("email")?.toString() ?? null;
    const password = formData.get("password")?.toString() ?? null;

    const mainPage = formData.get("mainPage")?.toString() || null;
    const mainInstagram = formData.get("mainInstagram")?.toString() || null;
    const mainAd = formData.get("mainAd")?.toString() || null;
    const mainGoogleAd = formData.get("mainGoogleAd")?.toString() || null;
    const mainSEOsites = formData.get("mainSEOsites")?.toString() || null;

    if (!userId) throw new Error("User ID is required");

    try {
        await connectDB();

        const currentUser = await User.findOne({ _id: userId, parent_client_id: clientId }).select({ _id: 1 }).lean();
        if (!currentUser) {
            throw new Error("User not found");
        }

        const updateData: any = {
            name,
            email,
            mainPage,
            mainInstagram,
            mainAd,
            mainGoogleAd,
            mainSEOsites,
            googleSearchConsoleAccounts: mainSEOsites ? [mainSEOsites] : [],
            connectAll: false,
        };

        if (password && password.trim() !== "") {
            updateData.password = password;
        }

        await User.findOneAndUpdate(
            { _id: userId, parent_client_id: clientId },
            updateData,
            { new: true }
        );

        redirect(`/en/analytics/${clientId}/users?updated=1`);
    } catch (err: any) {
        if (err.message && err.message.includes("NEXT_REDIRECT")) throw err;
        redirect(`/en/analytics/${clientId}/users/${userId}/edit?error=${encodeURIComponent(err?.message ?? "update_failed")}`);
    }
}

export async function deleteClientUserAction(formData: FormData): Promise<void> {
    const session = await getAnalyticsSession();
    if (!session || (session.user.role !== "client" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const clientId = session.user.role === "admin"
        ? formData.get("clientId")?.toString()
        : session.user.id;

    const userId = formData.get("userId")?.toString();

    const targetClientId = clientId || session.user.id;
    if (!targetClientId || !userId) throw new Error("Client ID and User ID are required");

    try {
        await connectDB();
        await User.findOneAndDelete({ _id: userId, parent_client_id: targetClientId });
        redirect(`/en/analytics/${targetClientId}/users?deleted=1`);
    } catch (err: any) {
        if (err.message && err.message.includes("NEXT_REDIRECT")) throw err;
        throw new Error("Delete failed");
    }
}
