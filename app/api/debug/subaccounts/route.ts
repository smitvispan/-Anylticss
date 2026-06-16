import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
import {prisma} from "@/lib/prisma";

import { fetchAndStoreSubAccounts } from "@/services/googleCampaigns";

export async function POST(req: Request) {
    try {
        console.log("🐛 DEBUG: Testing sub-account fetching...");

        const body = await req.json().catch(() => ({}));
        const { accountId } = body;

        if (!accountId) {
            return NextResponse.json({
                ok: false,
                error: "Account ID is required"
            }, { status: 400 });
        }

        // Get the account
        const account = await prisma.account.findFirst({
            where: {
                provider: "google",
                id: accountId
            },
            include: { user: true }
        });

        if (!account) {
            return NextResponse.json({
                ok: false,
                error: "Google account not found"
            }, { status: 404 });
        }

        console.log("🐛 DEBUG: Found account:", {
            id: account.id,
            provider: account.provider,
            hasAccessToken: !!account.accessToken,
            hasRefreshToken: !!account.refreshToken
        });

        const managerId = process.env.GOOGLE_MANAGER_ID;
        if (!managerId) {
            return NextResponse.json({
                ok: false,
                error: "GOOGLE_MANAGER_ID not set in environment"
            }, { status: 400 });
        }

        console.log("🐛 DEBUG: Manager ID:", managerId);

        // Test the sub-account fetching
        const subAccounts = await fetchAndStoreSubAccounts(
            account.accessToken!,
            managerId,
            account.userId || undefined,
            account.user?.email || undefined
        );

        console.log("🐛 DEBUG: Sub-accounts result:", {
            count: subAccounts.length,
            accounts: subAccounts.map(acc => ({
                id: acc.accountId,
                name: acc.descriptiveName
            }))
        });

        return NextResponse.json({
            ok: true,
            subAccounts,
            count: subAccounts.length,
            debug: {
                managerId,
                accountId: account.id,
                hasAccessToken: !!account.accessToken
            }
        });

    } catch (err: any) {
        console.error("🐛 DEBUG: Error:", err);
        return NextResponse.json({
            ok: false,
            error: err.message,
            stack: err.stack
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        console.log("🐛 DEBUG: Checking stored sub-accounts...");

        const subAccounts = await prisma.subAccount.findMany({
            orderBy: { descriptiveName: 'asc' }
        });

        console.log("🐛 DEBUG: Stored sub-accounts:", subAccounts.length);

        return NextResponse.json({
            ok: true,
            subAccounts,
            count: subAccounts.length
        });

    } catch (err: any) {
        console.error("🐛 DEBUG: Error:", err);
        return NextResponse.json({
            ok: false,
            error: err.message
        }, { status: 500 });
    }
}