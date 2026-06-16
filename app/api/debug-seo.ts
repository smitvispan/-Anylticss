// app/api/debug-seo.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import prisma from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("🔍 Debug SEO - Session User ID:", session.user.id);

        // Find the Google account
        const account = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "google"
            },
            include: { user: true },
        });

        if (!account) {
            return NextResponse.json({ error: "No Google account found" }, { status: 404 });
        }

        console.log("🔍 Debug SEO - Account found:", {
            id: account.id,
            userEmail: account.user?.email,
            accessTokenLength: account.accessToken?.length,
            accessTokenPreview: account.accessToken?.substring(0, 20) + '...'
        });

        // Test the token with a simple API call
        try {
            const testResponse = await axios.get(
                "https://www.googleapis.com/oauth2/v1/tokeninfo",
                {
                    params: { access_token: account.accessToken }
                }
            );

            console.log("✅ Token info:", testResponse.data);

            // Now test Search Console API with the app's token
            const scResponse = await axios.get(
                "https://www.googleapis.com/webmasters/v3/sites",
                {
                    headers: {
                        Authorization: `Bearer ${account.accessToken}`,
                    },
                }
            );

            return NextResponse.json({
                success: true,
                tokenInfo: testResponse.data,
                searchConsole: scResponse.data,
                message: "API call successful with app token"
            });

        } catch (apiError: any) {
            console.error("❌ API Error with app token:", {
                status: apiError.response?.status,
                data: apiError.response?.data,
                message: apiError.message
            });

            return NextResponse.json({
                success: false,
                error: apiError.response?.data || apiError.message,
                tokenPreview: account.accessToken?.substring(0, 50) + '...'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("❌ Debug error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}