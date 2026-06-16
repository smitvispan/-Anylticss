import { NextRequest } from "next/server";
import { syncPagesForUser, syncPagesForAllUsers } from "@/lib/syncPages";

export const runtime = "nodejs"; // ensure Node runtime (not Edge)
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId as string | undefined;

    if (userId) {
      const savedIds = await syncPagesForUser(userId);
      return Response.json({ ok: true, mode: "single", userId, saved: savedIds.length, ids: savedIds });
    }

    const result = await syncPagesForAllUsers();
    return Response.json({ ok: true, mode: "all", result });
  } catch (e: any) {
    console.error("Sync pages error:", e);
    return new Response(e?.message || "Failed to sync pages", { status: 500 });
  }
}
