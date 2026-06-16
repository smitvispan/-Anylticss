import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
import { prisma } from '@/lib/prisma';


export async function GET() {
    try {
        console.log("🔍 Fetching Google accounts...");

        const accounts = await prisma.account.findMany({
            where: {
                provider: "google"
            },
            include: {
                user: true
            },
            // Remove the orderBy since Account doesn't have createdAt
            // Or order by another field like id
        });

        console.log(`✅ Found ${accounts.length} Google accounts`);

        return NextResponse.json({
            ok: true,
            accounts,
            count: accounts.length
        });

    } catch (err: any) {
        console.error("[accounts] API error:", err);
        return NextResponse.json({
            ok: false,
            error: err.message || "Failed to load accounts"
        }, { status: 500 });
    }
}