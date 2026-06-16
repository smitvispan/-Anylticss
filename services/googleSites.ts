// services/googleSites.ts
import axios from "axios";
// import prisma from "@/lib/prisma";
import { prisma } from '@/lib/prisma';
import google from "next-auth/providers/google";

export interface GoogleSite {
    siteUrl: string;
    permissionLevel: string;
    userId?: string;
    userEmail?: string;
    isActive?: boolean;
    lastSynced?: Date;
}

/* ------------------------------------------------------------------
   ✅ 1. Generate Access Token Dynamically using OAuth Playground Style
   ------------------------------------------------------------------ */
async function generateAccessToken(): Promise<string> {
    try {
        const tokenEndpoint = "https://oauth2.googleapis.com/token";

        // This refresh token must be generated **ONE TIME** via Google OAuth Playground
        const refreshToken = process.env.REFRESH_TOKEN;
        if (!refreshToken) throw new Error("Missing GOOGLE_REFRESH_TOKEN in .env");

        const body = {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        };

        const response = await axios.post(tokenEndpoint, body, {
            headers: { "Content-Type": "application/json" }
        });

        if (!response.data.access_token) {
            throw new Error("Google did not return access_token");
        }

        console.log("✔ Dynamic Access Token Generated");
        return response.data.access_token;

    } catch (err: any) {
        console.error("❌ Failed to generate access token:", err.message);
        throw new Error("Google OAuth Token Error: " + err.message);
    }
}

/* ------------------------------------------------------------------
   ✅ 2. Fetch Authorized Google Sites
   ------------------------------------------------------------------ */
export async function getAuthorizedSites(accessToken: string): Promise<GoogleSite[]> {
    try {
        console.log("Here is a accesstoken -----------------------------------------------------------");

        // 🎯 REPLACED HARDCODED TOKEN WITH DYNAMIC TOKEN
        const atoken = await generateAccessToken();

        console.log("Here is a accesstoken -----------------------------------------------------------");

        const url = "https://searchconsole.googleapis.com/webmasters/v3/sites";
        const headers = {
            Authorization: `Bearer ${atoken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        };

        console.log("[GoogleSites] Fetching authorized sites for user...");

        const response = await axios.get(url, {
            headers,
            timeout: 30000,
            validateStatus: (status) => status < 500,
        });

        if (response.status !== 200) {
            console.error("[GoogleSites] API call failed with status:", response.status);
            throw new Error(`Search Console API Error: ${response.status}`);
        }

        const sites = response.data?.siteEntry;
        if (!sites || !Array.isArray(sites)) {
            console.warn("[GoogleSites] No sites found in response");
            return [];
        }

        const normalized: GoogleSite[] = sites.map((s: any) => ({
            siteUrl: String(s.siteUrl),
            permissionLevel: s.permissionLevel || "unknown",
        }));

        console.log(`[GoogleSites] Found ${normalized.length} sites`);
        return normalized;

    } catch (error: any) {
        console.error("[GoogleSites] Error fetching sites:", error.message);
        throw new Error(`Failed to fetch sites: ${error.message}`);
    }
}

/* ------------------------------------------------------------------
   ✅ 3. Sync Google Sites into MongoDB (NO LOGIC CHANGED)
   ------------------------------------------------------------------ */
export async function syncAuthorizedSitesToDB(accessToken: string, userId: string, userEmail?: string) {
    try {
        console.log("[GoogleSites] Syncing authorized sites to DB...");

        const authorizedSites = await getAuthorizedSites(accessToken);
        console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        console.log(authorizedSites);

        if (authorizedSites.length === 0) {
            console.log("[GoogleSites] No sites to sync to DB.");
            return [];
        }

        const upserts = await Promise.all(
            authorizedSites.map((site) =>
                prisma.gscSite.upsert({
                    where: {
                        siteUrl_userId: {
                            siteUrl: site.siteUrl,
                            userId,
                        },
                    },
                    update: {
                        permissionLevel: site.permissionLevel,
                        isActive: true,
                        lastSynced: new Date(),
                    },
                    create: {
                        siteUrl: site.siteUrl,
                        permissionLevel: site.permissionLevel,
                        userId,
                        userEmail,
                        isActive: true,
                        lastSynced: new Date(),
                    },
                })
            )
        );

        console.log(`[GoogleSites] Synced ${upserts.length} sites to the DB`);
        return upserts;

    } catch (error: any) {
        console.error("[GoogleSites] Sync to DB failed:", error.message);
        throw new Error(`Failed to sync sites: ${error.message}`);
    }
}




