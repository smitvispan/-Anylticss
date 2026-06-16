// app/api/sub-accounts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authOptions } from "@/lib/auth";
import { getSubAccounts, getSubAccountsAlternative } from "../../../services/googleSubAccounts";
// import prisma from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "@/services/tokenManager";

export async function GET() {
    try {
        console.log("[SubAccounts] Fetching sub-accounts...");

        // Check authentication
        const session = await getServerSession(authOptions);

        if (!session) {
            console.warn("[SubAccounts] Unauthorized access attempt");
            return NextResponse.json({
                success: false,
                error: "Unauthorized - Please sign in to access this resource"
            }, { status: 401 });
        }

        console.log("[SubAccounts] User authenticated:", session.user?.email);

        // Get the first Google account from database (manager account)
        const account = await prisma.account.findFirst({
            where: { provider: "google" },
            include: { user: true },
        });

        if (!account) {
            console.warn("[SubAccounts] No Google account found in DB for user:", session.user?.email);
            return NextResponse.json({
                success: false,
                error: "No Google Ads account connected. Please connect your Google Ads account first."
            }, { status: 404 });
        }

        let { accessToken, refreshToken } = account;

        // Refresh token if needed
        if (!accessToken && refreshToken) {
            console.log("[SubAccounts] Refreshing access token...");
            try {
                accessToken = await refreshAccessToken(account.id, refreshToken);
            } catch (tokenError: any) {
                console.error("[SubAccounts] Token refresh failed:", tokenError);
                return NextResponse.json({
                    success: false,
                    error: "Authentication token expired. Please re-authenticate your Google Ads account."
                }, { status: 401 });
            }
        }

        if (!accessToken) {
            console.warn("[SubAccounts] No valid access token for account:", account.id);
            return NextResponse.json({
                success: false,
                error: "No valid access token. Please re-authenticate your Google Ads account."
            }, { status: 401 });
        }

        let subAccounts;

        try {
            console.log("[SubAccounts] Attempting to fetch sub-accounts using main method...");
            // Try the main method first
            subAccounts = await getSubAccounts(accessToken, process.env.GOOGLE_MANAGER_ID || "");
            console.log("[SubAccounts] Main method successful, found:", subAccounts.length, "accounts");
        } catch (error: any) {
            console.warn("[SubAccounts] Main method failed:", error.message);

            try {
                console.log("[SubAccounts] Trying alternative method...");
                // Try alternative method
                subAccounts = await getSubAccountsAlternative(accessToken);
                console.log("[SubAccounts] Alternative method successful, found:", subAccounts.length, "accounts");
            } catch (altError: any) {
                console.error("[SubAccounts] All methods failed:", altError.message);

                // Return at least the manager account as fallback
                const managerId = process.env.GOOGLE_MANAGER_ID?.replace(/-/g, '');
                if (managerId) {
                    console.log("[SubAccounts] Returning fallback manager account");
                    subAccounts = [{
                        customerId: managerId,
                        descriptiveName: "Manager Account",
                        manager: true,
                        testAccount: false,
                    }];
                } else {
                    throw new Error("Failed to fetch sub-accounts and no manager account configured");
                }
            }
        }

        if (!subAccounts || subAccounts.length === 0) {
            console.warn("[SubAccounts] No sub-accounts found");

            // Return at least the manager account
            const managerId = process.env.GOOGLE_MANAGER_ID?.replace(/-/g, '');
            const fallbackAccounts = managerId ? [{
                customerId: managerId,
                descriptiveName: "Manager Account",
                manager: true,
                testAccount: false,
            }] : [];

            return NextResponse.json({
                success: true,
                subAccounts: fallbackAccounts,
                warning: "No sub-accounts found. Only manager account is available."
            });
        }

        console.log(`[SubAccounts] ✅ Successfully returning ${subAccounts.length} accounts`);
        return NextResponse.json({
            success: true,
            subAccounts,
            count: subAccounts.length
        });

    } catch (error: any) {
        console.error("[SubAccounts] Error:", error.message);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to fetch sub-accounts. Please check your manager account permissions and developer token."
            },
            { status: 500 }
        );
    }
}
