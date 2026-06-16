// app/api/debug-user/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                accounts: true,
                gscSites: true,
                seoReports: { take: 5 }
            }
        });

        return NextResponse.json({
            session: {
                userId: session.user.id,
                userEmail: session.user.email,
                userIdLength: session.user.id.length,
                isValidObjectId: /^[0-9a-fA-F]{24}$/.test(session.user.id)
            },
            user: user ? {
                id: user.id,
                email: user.email,
                accountCount: user.accounts.length,
                seoAccountCount: user.gscSites.length,
                seoReportCount: user.seoReports.length,
                accounts: user.accounts.map((acc: any) => ({
                    provider: acc.provider,
                    hasAccessToken: !!acc.accessToken,
                    hasRefreshToken: !!acc.refreshToken,
                    scopes: acc.scope
                }))
            } : null
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
