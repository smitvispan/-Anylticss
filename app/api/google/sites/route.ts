// app/api/google/sites/route.ts
import { auth } from "@/lib/auth"; // Existing Google Authentication
import { syncAuthorizedSitesToDB } from "@/services/googleSites"; // Sync Function

// Route handler to fetch and sync Google Sites from GSC to the DB
export async function GET() {

    const session = await auth();
    if (!session || !(session as any).accessToken || (session as any).provider !== "google") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const accessToken = (session as any).accessToken as string;
        const userId = (session.user as any).id as string;
        const userEmail = session.user?.email || undefined;

        // Sync the authorized sites to the DB
        const syncedSites = await syncAuthorizedSitesToDB(accessToken, userId, userEmail);

        return new Response(
            JSON.stringify({ success: true, count: syncedSites.length, sites: syncedSites }),
            { status: 200 }
        );
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}




