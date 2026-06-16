import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import prisma from "@/lib/prisma";
import {prisma} from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }

        console.log("🔍 Debug Auth - Session:", {
            userId: session.user?.id,
            userEmail: session.user?.email,
            userName: session.user?.name,
            provider: (session as any).provider,
            hasAccessToken: !!(session as any).accessToken
        });

        // Get all accounts for this user
        const accounts = await prisma.account.findMany({
            where: {
                userId: session.user?.id
            },
            select: {
                id: true,
                provider: true,
                providerAccountId: true,
                accessToken: true,
                refreshToken: true,
                scope: true,
                expiresAt: true
            }
        });

        // Get user from database
        const user = await prisma.user.findUnique({
            where: {
                id: session.user?.id
            },
            select: {
                id: true,
                email: true,
                name: true,
                accounts: {
                    select: {
                        provider: true,
                        providerAccountId: true
                    }
                }
            }
        });

        return NextResponse.json({
            session: {
                userId: session.user?.id,
                email: session.user?.email,
                name: session.user?.name,
                provider: (session as any).provider
            },
            accounts,
            user,
            message: "Debug info collected"
        });

    } catch (error: any) {
        console.error("❌ Debug auth error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}