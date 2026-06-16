// // app/api/seo/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { fetchAndStoreSeoReports, querySeoReports } from "@/services/seoService";
// // import prisma from "@/lib/prisma";
// import { prisma } from '@/lib/prisma';


// export async function POST(req: Request) {
//     try {
//         const session = await getServerSession(authOptions);
//         if (!session?.user?.id) {
//             return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
//         }

//         const body = await req.json();
//         const { siteUrl, startDate, endDate, pageContains, rowLimit, dimensions } = body;

//         if (!siteUrl || !startDate || !endDate) {
//             return NextResponse.json({ ok: false, error: "Missing required parameters" }, { status: 400 });
//         }

//         const result = await fetchAndStoreSeoReports({
//             userId: session.user.id,
//             accountId: (session.user as any).accountId, // ensure this exists in your session
//             siteUrl,
//             startDate,
//             endDate,
//             pageContains: pageContains ?? null,
//             rowLimit,
//             dimensions,
//         });

//         return NextResponse.json({ ok: true, result });
//     } catch (err: any) {
//         console.error("SEO POST error:", err);
//         return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
//     }
// }
// export async function GET(req: Request) {
//     try {
//         const session = await getServerSession(authOptions);
//         if (!session?.user?.id) {
//             return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
//         }

//         const url = new URL(req.url);
//         const siteUrl = url.searchParams.get("siteUrl") ?? undefined;
//         const start = url.searchParams.get("start") ?? undefined;
//         const end = url.searchParams.get("end") ?? undefined;

//         // ✅ read filters
//         const pageContains = url.searchParams.get("pageContains") ?? undefined;

//         // ✅ pagination params
//         const limit = Number(url.searchParams.get("limit") ?? 100);
//         const page = Number(url.searchParams.get("page") ?? 0);

//         const where: any = { userId: session.user.id };
//         if (siteUrl) where.siteUrl = siteUrl;
//         if (start || end) {
//             where.date = {};
//             if (start) where.date.gte = new Date(`${start}T00:00:00.000Z`);
//             if (end) where.date.lte = new Date(`${end}T23:59:59.999Z`);
//         }

//         // ✅ Filter at DB level based on pageContains
//         if (pageContains) {
//             where.page = { contains: pageContains };
//         }

//         const rows = await prisma.seoReport.findMany({
//             where,
//             orderBy: [{ date: "desc" }, { impressions: "desc" }],
//             skip: page * limit,
//             take: limit,
//         });

//         return NextResponse.json({ ok: true, rows });
//     } catch (err: any) {
//         console.error("SEO GET error:", err);
//         return NextResponse.json(
//             { ok: false, error: err?.message || "Internal error" },
//             { status: 500 }
//         );
//     }
// }















// 28 11

// app/api/seo/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientSession } from "@/lib/client-auth-server";
import { querySearchConsoleReports, resolveGscAccountForUser, serializeSeoReport, syncSearchConsole } from "@/lib/syncSearchConsole";

function resolveRequestedAccount(params: {
    accounts: any[];
    gscSiteId?: string;
    siteUrl?: string;
}) {
    const { accounts, gscSiteId, siteUrl } = params;
    if (!Array.isArray(accounts) || accounts.length === 0) {
        return null;
    }

    if (gscSiteId) {
        return accounts.find((account) => String(account._id) === gscSiteId) || null;
    }

    if (siteUrl) {
        return accounts.find((account) => account.siteUrl === siteUrl) || null;
    }

    return accounts[0];
}

async function resolveAuthenticatedUserId() {
    const clientSession = await getClientSession();
    if (clientSession?.user?.id) {
        return clientSession.user.id;
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        return session.user.id;
    }

    return null;
}

export async function POST(req: Request) {
    try {
        const callerId = await resolveAuthenticatedUserId();
        if (!callerId) {
            return NextResponse.json(
                { ok: false, error: "Not authenticated" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const {
            siteUrl: rawSiteUrl,
            startDate,
            endDate,
            pageContains,
            rowLimit,
            dimensions,
            gscSiteId,
            targetUserId,
        } = body;

        const userId = targetUserId || callerId;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { ok: false, error: "Missing required dates" },
                { status: 400 }
            );
        }

        const { accounts } = await resolveGscAccountForUser(userId);
        const requestedAccount = resolveRequestedAccount({
            accounts,
            gscSiteId,
            siteUrl: rawSiteUrl,
        });
        const siteUrl = requestedAccount?.siteUrl;
        const accountId = requestedAccount?._id ? String(requestedAccount._id) : undefined;

        if (!siteUrl || !accountId) {
            return NextResponse.json(
                { ok: false, error: "Missing siteUrl or Search Console account" },
                { status: 400 }
            );
        }

        const result = await syncSearchConsole({
            userId,
            gscAccountId: accountId,
            siteUrl,
            startDate,
            endDate,
            pageContains: pageContains ?? null,
            rowLimit,
            dimensions,
        });

        return NextResponse.json({
            ok: true,
            result: {
                ...result,
                stored: Array.isArray(result?.stored) ? result.stored.map(serializeSeoReport) : [],
            },
        });
    } catch (err: any) {
        console.error("SEO POST error:", err);
        return NextResponse.json(
            { ok: false, error: err?.message || "Internal error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const callerId = await resolveAuthenticatedUserId();
        if (!callerId) {
            return NextResponse.json(
                { ok: false, error: "Not authenticated" },
                { status: 401 }
            );
        }

        const url = new URL(req.url);
        const rawSiteUrl = url.searchParams.get("siteUrl") ?? undefined;
        const start = url.searchParams.get("start") ?? undefined;
        const end = url.searchParams.get("end") ?? undefined;
        const pageContains = url.searchParams.get("pageContains") ?? undefined;
        const targetUserId = url.searchParams.get("targetUserId") ?? undefined;
        const limit = Number(url.searchParams.get("limit") ?? 100);
        const page = Number(url.searchParams.get("page") ?? 0);

        const userId = targetUserId || callerId;

        const gscSiteId = url.searchParams.get("gscSiteId") ?? undefined;
        const { accounts } = await resolveGscAccountForUser(userId);
        const requestedAccount = resolveRequestedAccount({
            accounts,
            gscSiteId,
            siteUrl: rawSiteUrl,
        });
        const siteUrl = requestedAccount?.siteUrl;

        if (!siteUrl) {
            return NextResponse.json(
                { ok: false, error: "Missing siteUrl or Search Console account" },
                { status: 400 }
            );
        }

        const rows = await querySearchConsoleReports({
            userId,
            siteUrl,
            start,
            end,
            pageContains,
            limit,
            page,
        });

        return NextResponse.json({ ok: true, rows: rows.map(serializeSeoReport) });
    } catch (err: any) {
        console.error("SEO GET error:", err);
        return NextResponse.json(
            { ok: false, error: err?.message || "Internal error" },
            { status: 500 }
        );
    }
}
