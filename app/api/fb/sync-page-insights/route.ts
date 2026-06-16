import { NextRequest } from "next/server";
import { syncPageInsightsForAllPages, syncPageInsightsForPage } from "@/lib/syncPageInsights";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { pageId, since, until } = body as { pageId?: string; since?: string; until?: string };

  try {
    if (pageId) {
      const id = await syncPageInsightsForPage(pageId, { since, until });
      return Response.json({ ok: true, mode: "single", id });
    }
    const result = await syncPageInsightsForAllPages({ since, until });
    return Response.json({ ok: true, mode: "all", result });
  } catch (e: any) {
    return new Response(e?.message || "Failed to sync insights", { status: 500 });
  }
}
