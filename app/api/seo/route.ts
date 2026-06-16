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
import { querySearchConsoleReports, resolveGscAccountForUser, serializeSeoReport, syncSearchConsole } from "@/lib/syncSearchConsole";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
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
        } = body;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { ok: false, error: "Missing required dates" },
                { status: 400 }
            );
        }

        const { account } = await resolveGscAccountForUser(session.user.id);
        const siteUrl = rawSiteUrl || account?.siteUrl;
        const accountId = gscSiteId || (account?._id ? String(account._id) : undefined);

        if (!siteUrl || !accountId) {
            return NextResponse.json(
                { ok: false, error: "Missing siteUrl or Search Console account" },
                { status: 400 }
            );
        }

        const result = await syncSearchConsole({
            userId: session.user.id,
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
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
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
        const limit = Number(url.searchParams.get("limit") ?? 100);
        const page = Number(url.searchParams.get("page") ?? 0);

        const { account } = await resolveGscAccountForUser(session.user.id);
        const siteUrl = rawSiteUrl || account?.siteUrl;

        if (!siteUrl) {
            return NextResponse.json(
                { ok: false, error: "Missing siteUrl or Search Console account" },
                { status: 400 }
            );
        }

        const rows = await querySearchConsoleReports({
            userId: session.user.id,
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
