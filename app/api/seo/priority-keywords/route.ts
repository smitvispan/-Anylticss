// app/api/seo/priority-keywords/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import prisma from "@/lib/prisma";
import { prisma } from '@/lib/prisma';


// ✅ Your static default 10 keywords (seeded on first save)
const DEFAULT_KEYWORDS: string[] = [
    "access 125 accessories",
    "honda activa accessories",
    "activa accessories",
    "suzuki access 125 accessories",
    "activa 125 accessories",
    "hero destini 125 accessories",
    "tvs jupiter accessories",
    "burgman accessories",
    "bajaj chetak accessories",
    "activa 4g accessories",
];

/**
 * GET /api/seo/priority-keywords?siteUrl=sc-domain:example.com
 * Returns: { ok:true, keywords: string[] }
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
        }

        const url = new URL(req.url);
        const siteUrl = url.searchParams.get("siteUrl") ?? undefined;

        const rows: Array<{ keyword: string }> = (await prisma.userKeyword.findMany({
            where: { userId: session.user.id, siteUrl },
            orderBy: { createdAt: "asc" },
            select: { keyword: true },
        })) as any;

        return NextResponse.json({ ok: true, keywords: rows.map((r) => r.keyword) });
    } catch (err: any) {
        console.error("PriorityKeywords GET error:", err);
        return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
    }
}

/**
 * POST /api/seo/priority-keywords
 * Body: { siteUrl?: string, keywords: string } // comma-separated OR string[]
 * or   { siteUrl?: string, keywords: string[] }
 * Behavior:
 * - If user has NO saved keywords yet for (userId, siteUrl), seed DB with DEFAULT_KEYWORDS first.
 * - Then add the user's provided keywords (deduped, case-insensitive).
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
        }

        const body = await req.json();
        const siteUrl: string | undefined = body.siteUrl ?? undefined;

        let list: string[] = [];
        if (Array.isArray(body.keywords)) {
            list = body.keywords as string[];
        } else if (typeof body.keywords === "string") {
            list = body.keywords.split(",").map((s: string) => s.trim());
        }

        // Normalize: trim, dedupe case-insensitively, keep first-seen original casing
        const dedupeMap = new Map<string, string>(); // key: lowercased, value: original trimmed
        for (const raw of list) {
            const trimmed = (raw ?? "").trim();
            if (!trimmed) continue;
            const key = trimmed.toLowerCase();
            if (!dedupeMap.has(key)) dedupeMap.set(key, trimmed);
        }
        const normalized = Array.from(dedupeMap.values());

        if (!normalized.length) {
            return NextResponse.json({ ok: false, error: "No valid keywords provided" }, { status: 400 });
        }

        // Fetch existing for this user+site
        const existing: Array<{ keyword: string }> = (await prisma.userKeyword.findMany({
            where: { userId: session.user.id, siteUrl },
            select: { keyword: true },
        })) as any;
        let existingSet = new Set(existing.map((e) => e.keyword.toLowerCase()));

        // ✅ First-time save: seed defaults (insert defaults first so they appear before user keywords in UI)
        if (existing.length === 0) {
            const defaultToCreate = DEFAULT_KEYWORDS.filter(
                (k) => !existingSet.has(k.toLowerCase())
            );

            if (defaultToCreate.length) {
                await prisma.$transaction(
                    defaultToCreate.map((k) =>
                        prisma.userKeyword.create({
                            data: {
                                userId: session.user.id,
                                siteUrl,
                                keyword: k,
                            },
                        })
                    )
                );
            }

            // refresh existingSet after seeding
            existingSet = new Set(
                [
                    ...Array.from(existingSet.values()),
                    ...defaultToCreate.map((k) => k.toLowerCase()),
                ]
            );
        }

        // Now add user's keywords that aren't already present
        const toCreate = normalized.filter((k) => !existingSet.has(k.toLowerCase()));
        if (toCreate.length) {
            await prisma.$transaction(
                toCreate.map((k) =>
                    prisma.userKeyword.create({
                        data: {
                            userId: session.user.id,
                            siteUrl,
                            keyword: k,
                        },
                    })
                )
            );
        }

        const rows: Array<{ keyword: string }> = (await prisma.userKeyword.findMany({
            where: { userId: session.user.id, siteUrl },
            orderBy: { createdAt: "asc" },
            select: { keyword: true },
        })) as any;

        return NextResponse.json({ ok: true, keywords: rows.map((r) => r.keyword) });
    } catch (err: any) {
        console.error("PriorityKeywords POST error:", err);
        return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
    }
}

/**
 * DELETE /api/seo/priority-keywords
 * Body: { siteUrl?: string, keyword: string }
 * Case-insensitive delete for Mongo.
 */
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
        }

        const body = await req.json();
        const siteUrl: string | undefined = body.siteUrl ?? undefined;
        const keywordInput: string = (body.keyword || "").trim();
        if (!keywordInput) {
            return NextResponse.json({ ok: false, error: "Keyword required" }, { status: 400 });
        }

        // Mongo-safe case-insensitive delete:
        const candidates: Array<{ id: string; keyword: string }> = (await prisma.userKeyword.findMany({
            where: { userId: session.user.id, siteUrl },
            select: { id: true, keyword: true },
        })) as any;

        const match = candidates.find(
            (c) => c.keyword.toLowerCase() === keywordInput.toLowerCase()
        );

        if (match) {
            await prisma.userKeyword.delete({ where: { id: match.id } });
        }

        const rows: Array<{ keyword: string }> = (await prisma.userKeyword.findMany({
            where: { userId: session.user.id, siteUrl },
            orderBy: { createdAt: "asc" },
            select: { keyword: true },
        })) as any;

        return NextResponse.json({ ok: true, keywords: rows.map((r) => r.keyword) });
    } catch (err: any) {
        console.error("PriorityKeywords DELETE error:", err);
        return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
    }
}
