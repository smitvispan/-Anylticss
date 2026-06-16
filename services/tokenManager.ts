// // // services/tokenManager.ts
// import axios from "axios";
// import prisma from "../lib/prisma";

// const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID!;
// const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET!;

// /**
//  * Refreshes access token using refresh token & persists it to DB.
//  */
// export async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
//     if (!refreshToken) throw new Error("Missing refresh token for user");

//     try {
//         const resp = await axios.post(
//             "https://oauth2.googleapis.com/token",
//             new URLSearchParams({
//                 client_id: CLIENT_ID,
//                 client_secret: CLIENT_SECRET,
//                 refresh_token: refreshToken,
//                 grant_type: "refresh_token",
//             }),
//             { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );

//         const { access_token, expires_in } = resp.data;

//         console.log(resp);

//         console.log(`🔄 Refreshed access token for user=${userId}, expires_in=${expires_in}`);

//         // ✅ Persist token in DB so next request uses the fresh one
//         await prisma.account.update({
//             where: { id: userId },
//             data: { accessToken: access_token },
//         });

//         return access_token;
//     } catch (err: any) {
//         console.error("❌ Failed to refresh access token:", err.response?.data || err.message);
//         throw new Error("Could not refresh access token. Check your OAuth2 credentials.");
//     }
// }













// // services/tokenManager.ts
// import axios from "axios";
// // import prisma from "../lib/prisma";
// import { prisma } from '@/lib/prisma';


// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// /**
//  * Refreshes access token using refresh token & persists it to DB.
//  */
// export async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
//     if (!refreshToken) throw new Error("Missing refresh token for user");

//     try {
//         const resp = await axios.post(
//             "https://oauth2.googleapis.com/token",
//             new URLSearchParams({
//                 client_id: CLIENT_ID,
//                 client_secret: CLIENT_SECRET,
//                 refresh_token: refreshToken,
//                 grant_type: "refresh_token",
//             }),
//             { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );

//         const { access_token, expires_in } = resp.data;

//         console.log(`🔄 Refreshed access token for user=${userId}, expires_in=${expires_in}`);

//         // ✅ Update the access token using the correct unique field
//         await prisma.account.updateMany({
//             where: { userId, provider: "google" },
//             data: { accessToken: access_token },
//         });

//         return access_token;
//     } catch (err: any) {
//         console.error("❌ Failed to refresh access token:", err.response?.data || err.message);
//         throw new Error("Could not refresh access token. Check your OAuth2 credentials.");
//     }
// }

















// 4 12 

import axios from "axios";
import { prisma } from '@/lib/prisma';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

/**
 * Refreshes access token using refresh token & persists it to DB.
 */
export async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    if (!refreshToken) throw new Error("Missing refresh token for user");

    try {
        // Sending POST request to refresh the token
        const resp = await axios.post(
            "https://oauth2.googleapis.com/token",
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        // Log the response for debugging purposes
        const { access_token, expires_in } = resp.data;
        console.log(`🔄 Refreshed access token for user=${userId}, expires_in=${expires_in}`);

        // ✅ Update the access token in the database for the user
        await prisma.account.updateMany({
            where: { userId, provider: "google" },
            data: { accessToken: access_token },
        });

        // Return the newly refreshed access token
        return access_token;
    } catch (err: any) {
        // Log the full error response for better debugging
        console.error("❌ Failed to refresh access token:", err.response?.data || err.message);

        // Provide a more specific error message to help diagnose the issue
        if (err.response?.data?.error === 'invalid_grant') {
            throw new Error("Invalid or expired refresh token. Please reauthenticate.");
        }

        // Throw a general error if we can't determine the exact issue
        throw new Error("Could not refresh access token. Check your OAuth2 credentials or refresh token.");
    }
}

