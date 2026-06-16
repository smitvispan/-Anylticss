// import axios from "axios";
// // import prisma from "../lib/prisma";
// import { prisma } from '@/lib/prisma';
// import { refreshAccessToken } from "./tokenManager";

// function normalizeCustomerId(raw?: string) {
//     if (!raw) return "";
//     return String(raw).replace(/^customers\//i, "").replace(/[^\d-]/g, "");
// }

// // Fetch and store sub-accounts
// export async function fetchAndStoreSubAccounts(
//     accessToken: string,
//     managerId: string,
//     userId?: string | null,
//     userEmail?: string | null
// ) {
//     const normalizedId = normalizeCustomerId(managerId);
//     // const url = `https://googleads.googleapis.com/v19/customers/${normalizedId}/googleAds:search`;
//     const url = `https://googleads.googleapis.com/v19/customers/${managerId}/googleAds:search`;


//     const headers: Record<string, string> = {
//         Authorization: `Bearer ${accessToken}`,
//         "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
//         "Content-Type": "application/json",
//         "login-customer-id": normalizedId,
//     };

//     const query = `
//     SELECT
//       customer_client.id,
//       customer_client.descriptive_name,
//       customer_client.manager,
//       customer_client.level,
//       customer_client.time_zone
//     FROM customer_client
//   `;

//     console.log(`🔍 [GAQL] Fetching sub-accounts for manager: ${normalizedId}`);
//     console.log(`🔍 [GAQL] URL: ${url}`);
//     console.log(`🔍 [GAQL] Access Token exists: ${!!accessToken}`);

//     try {
//         console.log("🔍 [GAQL] Making API request...");
//         const resp = await axios.post(url, { query }, {
//             headers,
//             timeout: 30000
//         });

//         console.log("🔍 [GAQL] API Response received:", {
//             status: resp.status,
//             hasData: !!resp.data,
//             dataLength: Array.isArray(resp.data) ? resp.data.length : 'not array'
//         });

//         if (!resp.data || !Array.isArray(resp.data) || !resp.data[0]?.results) {
//             console.warn("❌ [GAQL] No sub-accounts found in response");
//             return [];
//         }

//         const results = resp.data[0].results;


//         console.log(`✅ [GAQL] Found ${results.length} sub-accounts in API response`);

//         const subAccounts = results.map((r: any) => {
//             const accountData = {
//                 accountId: r.customerClient.id,
//                 // accountId: r.customerClient.clientCustomer.replace("customers/", ""),
//                 descriptiveName: r.customerClient.descriptiveName || `Account ${r.customerClient.id}`,
//                 manager: Boolean(r.customerClient.manager),
//                 level: String(r.customerClient.level),
//                 timeZone: r.customerClient.timeZone,
//                 resourceName: r.customerClient.resourceName,
//                 customerId: normalizedId,
//                 userId: userId || undefined,
//                 userEmail: userEmail || undefined,
//                 lastSynced: new Date(),
//             };

//             console.log(`🔍 [GAQL] Processing account: ${accountData.accountId} - ${accountData.descriptiveName}`);
//             return accountData;
//         });

//         console.log(`💾 [GAQL] Storing ${subAccounts.length} sub-accounts in database...`);

//         // Store in database
//         const storedAccounts = [];
//         for (const account of subAccounts) {
//             try {
//                 console.log(`💾 [GAQL] Storing account: ${account.accountId}`);

//                 const stored = await prisma.subAccount.upsert({
//                     where: {
//                         accountId_customerId: {
//                             accountId: account.accountId,
//                             customerId: account.customerId,
//                         },
//                     },
//                     update: {
//                         descriptiveName: account.descriptiveName,
//                         manager: account.manager,
//                         level: account.level,
//                         timeZone: account.timeZone,
//                         resourceName: account.resourceName,
//                         lastSynced: account.lastSynced,
//                         isActive: true,
//                     },
//                     create: account,
//                 });

//                 storedAccounts.push(stored);
//                 console.log(`✅ [GAQL] Successfully stored: ${account.accountId}`);

//             } catch (error: any) {
//                 console.error(`❌ [GAQL] Failed to store sub-account ${account.accountId}:`, error.message);
//             }
//         }

//         // Mark any accounts not in the current fetch as inactive
//         try {
//             const inactiveUpdate = await prisma.subAccount.updateMany({
//                 where: {
//                     customerId: normalizedId,
//                     accountId: { notIn: subAccounts.map((acc: { accountId: any; }) => acc.accountId) }
//                 },
//                 data: { isActive: false }
//             });
//             console.log(`🔧 [GAQL] Marked ${inactiveUpdate.count} accounts as inactive`);
//         } catch (error: any) {
//             console.error("❌ [GAQL] Failed to mark inactive accounts:", error.message);
//         }

//         console.log(`🎉 [GAQL] Successfully stored ${storedAccounts.length} sub-accounts in database`);
//         return storedAccounts;

//     } catch (err: any) {
//         console.error("❌ [GAQL] Sub-accounts API error:", {
//             message: err.message,
//             response: err.response?.data,
//             status: err.response?.status
//         });
//         throw new Error(
//             `Google Ads Sub-accounts API failed: ${err.message}`
//         );
//     }
// }

// // Get sub-accounts from database
// export async function getSubAccountsFromDB(customerId?: string, userId?: string) {
//     try {
//         const whereClause: any = { isActive: true };

//         if (customerId) {
//             whereClause.customerId = customerId;
//         }

//         if (userId) {
//             whereClause.userId = userId;
//         }

//         console.log(`🔍 [DB] Fetching sub-accounts with filter:`, whereClause);

//         const subAccounts = await prisma.subAccount.findMany({
//             where: whereClause,
//             orderBy: { descriptiveName: 'asc' }
//         });

//         console.log(`✅ [DB] Retrieved ${subAccounts.length} sub-accounts from database`);
//         return subAccounts;
//     } catch (error: any) {
//         console.error("❌ [DB] Error fetching sub-accounts:", error.message);
//         return [];
//     }
// }

// // ... rest of your existing functions (fetchGoogleCampaignsUsingGAQL, syncCampaignsForAccount)

// export async function fetchGoogleCampaignsUsingGAQL(
//     accessToken: string,
//     customerId: string,
//     managerId?: string
// ) {
//     const normalizedId = normalizeCustomerId(customerId);
//     const url = `https://googleads.googleapis.com/v19/customers/${normalizedId}/googleAds:search`;

//     const headers: Record<string, string> = {
//         Authorization: `Bearer ${accessToken}`,
//         "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
//         "Content-Type": "application/json",
//     };
//     if (managerId) headers["login-customer-id"] = normalizeCustomerId(managerId);

//     const query = `
//     SELECT
//       campaign.id,
//       campaign.name,
//       campaign.status,
//       campaign.optimization_score,
//       campaign.advertising_channel_type,
//       campaign.bidding_strategy_type,
//       campaign_budget.amount_micros,
//       metrics.clicks,
//       metrics.impressions,
//       metrics.ctr,
//       metrics.average_cpc,
//       metrics.cost_micros
//     FROM campaign
//     WHERE campaign.status != 'REMOVED'
//     LIMIT 100
//   `;

//     console.log(`[GAQL] Fetching campaigns for ${normalizedId}`);

//     try {
//         const resp = await axios.post(url, { query }, { headers, timeout: 30000 });
//         if (!resp.data?.results) {
//             console.warn("[GAQL] No results found");
//             return [];
//         }

//         console.log(`[GAQL] Found ${resp.data.results.length} campaigns`);
//         return resp.data.results.map((r: any) => ({
//             campaign: r.campaign,
//             metrics: r.metrics,
//             campaignBudget: r.campaignBudget,
//             customerId: normalizedId,
//         }));
//     } catch (err: any) {
//         console.error("[GAQL] API error:", err.response?.data || err.message);
//         throw new Error(
//             `Google Ads API failed (${err.response?.status || "unknown"}): ${JSON.stringify(
//                 err.response?.data || err.message
//             )}`
//         );
//     }
// }

// export async function syncCampaignsForAccount(accountId: string, selectedCustomerId?: string) {
//     console.log("[sync] Starting sync for account:", accountId);

//     const account = await prisma.account.findUnique({
//         where: { id: accountId },
//         include: { user: true },
//     });

//     if (!account) throw new Error(`Account not found: ${accountId}`);
//     if (account.provider !== "google") {
//         console.log(`[sync] Skipped non-Google provider: ${account.provider}`);
//         return { accountId, synced: 0, reason: "non_google_provider" };
//     }

//     let { accessToken, refreshToken } = account;
//     const email = account.user?.email ?? "unknown";

//     // Use selected customer ID or fallback to env variable
//     const customerId = selectedCustomerId || process.env.GOOGLE_ADS_CUSTOMER_ID!;
//     const managerCustomerId = process.env.GOOGLE_MANAGER_ID || undefined;

//     if (!customerId) {
//         console.warn(`[sync] Missing customer ID`);
//         return { accountId, synced: 0, reason: "missing_customerId" };
//     }

//     // ✅ Refresh expired token if needed
//     if (!accessToken && refreshToken) {
//         console.log(`[sync] Refreshing token for ${email}`);
//         accessToken = await refreshAccessToken(accountId, refreshToken);
//     }

//     if (!accessToken) {
//         console.warn(`[sync] No valid access token for ${email}`);
//         return { accountId, synced: 0, reason: "no_token" };
//     }

//     const rows = await fetchGoogleCampaignsUsingGAQL(accessToken, customerId, managerCustomerId);
//     console.log(`[sync] Saving ${rows.length} campaigns for ${email}`);

//     for (const r of rows) {
//         const c = r.campaign || {};
//         const b = r.campaignBudget || {};
//         const m = r.metrics || {};

//         await prisma.campaign.upsert({
//             where: {
//                 campaignId_customerId: {
//                     campaignId: String(c.id),
//                     customerId: customerId,
//                 },
//             },
//             update: {
//                 name: c.name,
//                 status: c.status,
//                 advertisingChannelType: c.advertisingChannelType,
//                 // optimizationScore: c.optimizationScore,
//                 biddingStrategyType: c.biddingStrategyType,
//                 campaignBudgetAmountMicros: String(b.amountMicros ?? ""),
//                 metrics: m,
//                 updatedAt: new Date(),
//             },
//             create: {
//                 campaignId: String(c.id),
//                 userEmail: email,
//                 name: c.name,
//                 status: c.status,
//                 advertisingChannelType: c.advertisingChannelType,
//                 // optimizationScore: c.optimizationScore,
//                 biddingStrategyType: c.biddingStrategyType,
//                 campaignBudgetAmountMicros: String(b.amountMicros ?? ""),
//                 metrics: m,
//                 customerId: customerId,
//             },
//         });
//     }

//     console.log(`[sync] ✅ Synced ${rows.length} campaigns for ${email} (Customer: ${customerId})`);
//     return { accountId, synced: rows.length, customerId };
// }










//4 12 
import axios from "axios";
import { prisma } from '@/lib/prisma';
import { refreshAccessToken } from "./tokenManager";


function normalizeCustomerId(raw?: string) {
    if (!raw) return "";
    return String(raw).replace(/^customers\//i, "").replace(/[^\d-]/g, "");
}

// Fetch and store sub-accounts
export async function fetchAndStoreSubAccounts(
    accessToken: string,
    managerId: string,
    userId?: string | null,
    userEmail?: string | null
) {
    const normalizedId = normalizeCustomerId(managerId);
    const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v22";
    const url = `https://googleads.googleapis.com/${apiVersion}/customers/${managerId}/googleAds:search`;

    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
        "login-customer-id": normalizedId,
    };

    const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.manager,
      customer_client.level,
      customer_client.time_zone
    FROM customer_client
  `;

    console.log(`🔍 [GAQL] Fetching sub-accounts for manager: ${normalizedId}`);

    try {
        console.log("🔍 [GAQL] Making API request...");
        const resp = await axios.post(url, { query }, {
            headers,
            timeout: 30000
        });

        if (!resp.data || !Array.isArray(resp.data) || !resp.data[0]?.results) {
            console.warn("❌ [GAQL] No sub-accounts found in response");
            return [];
        }

        const results = resp.data[0].results;
        console.log(`✅ [GAQL] Found ${results.length} sub-accounts`);

        const subAccounts = results.map((r: any) => {
            const accountData = {
                accountId: r.customerClient.id,
                descriptiveName: r.customerClient.descriptiveName || `Account ${r.customerClient.id}`,
                manager: Boolean(r.customerClient.manager),
                level: String(r.customerClient.level),
                timeZone: r.customerClient.timeZone,
                resourceName: r.customerClient.resourceName,
                customerId: normalizedId,
                userId: userId || undefined,
                userEmail: userEmail || undefined,
                lastSynced: new Date(),
            };

            return accountData;
        });

        console.log(`💾 [GAQL] Storing ${subAccounts.length} sub-accounts in database...`);

        const storedAccounts = [];
        for (const account of subAccounts) {
            try {
                const stored = await prisma.subAccount.upsert({
                    where: {
                        accountId_customerId: {
                            accountId: account.accountId,
                            customerId: account.customerId,
                        },
                    },
                    update: account,
                    create: account,
                });

                storedAccounts.push(stored);
                console.log(`✅ [GAQL] Successfully stored: ${account.accountId}`);

            } catch (error: any) {
                console.error(`❌ [GAQL] Failed to store sub-account ${account.accountId}:`, error.message);
            }
        }

        // Mark inactive sub-accounts if they're not found in the current fetch
        const inactiveUpdate = await prisma.subAccount.updateMany({
            where: {
                customerId: normalizedId,
                accountId: { notIn: subAccounts.map((acc: { accountId: any }) => acc.accountId) }
            },
            data: { isActive: false }
        });
        console.log(`🔧 [GAQL] Marked ${inactiveUpdate.count} accounts as inactive`);

        return storedAccounts;

    } catch (err: any) {
        console.error("❌ [GAQL] Sub-accounts API error:", err);
        throw new Error(`Google Ads Sub-accounts API failed: ${err.message}`);
    }
}

export async function fetchGoogleCampaignsUsingGAQL(
    accessToken: string,
    customerId: string
) {
    const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v22";
    const url = `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`;

    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
    };

    const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.optimization_score,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    LIMIT 100
  `;

    try {
        const response = await axios.post(url, { query }, { headers, timeout: 30000 });
        return response.data.results;
    } catch (error: any) {
        console.error("Error fetching campaigns:", error);
        throw new Error("Google Ads API error: " + (error.message || "Unknown error"));
    }
}

export async function syncCampaignsForAccount(accountId: string, selectedCustomerId?: string) {
    // Directly use the provided accountId without querying Prisma for the account
    const customerId = selectedCustomerId || process.env.GOOGLE_ADS_CUSTOMER_ID!;

    if (!customerId) {
        console.warn(`[sync] Missing customer ID`);
        return { accountId, synced: 0, reason: "missing_customerId" };
    }

    // Fetch campaigns from Google Ads API
    const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN!; // Ensure the access token is provided (you can handle token refresh if necessary)

    if (!accessToken) {
        console.warn(`[sync] No valid access token`);
        return { accountId, synced: 0, reason: "no_token" };
    }

    // Fetch campaigns using the Google Ads API with the provided accountId and customerId
    const rows = await fetchGoogleCampaignsUsingGAQL(accessToken, customerId); // Use customerId directly
    console.log(`[sync] Saving ${rows.length} campaigns for account: ${accountId}`);

    // Save fetched campaigns to the database
    for (const r of rows) {
        const c = r.campaign || {};
        const b = r.campaignBudget || {};
        const m = r.metrics || {};

        await prisma.campaign.upsert({
            where: {
                campaignId_customerId: {
                    campaignId: String(c.id),
                    customerId: customerId,  // Ensure customerId is treated as a string
                },
            },
            update: {
                name: c.name,
                status: c.status,
                advertisingChannelType: c.advertisingChannelType,
                biddingStrategyType: c.biddingStrategyType,
                campaignBudgetAmountMicros: String(b.amountMicros ?? ""),
                metrics: m,
                updatedAt: new Date(),
            },
            create: {
                campaignId: String(c.id),
                userEmail: "unknown", // You can use a default or pass the email if needed
                name: c.name,
                status: c.status,
                advertisingChannelType: c.advertisingChannelType,
                biddingStrategyType: c.biddingStrategyType,
                campaignBudgetAmountMicros: String(b.amountMicros ?? ""),
                metrics: m,
                customerId: customerId,  // Ensure customerId is treated as a string
            },
        });
    }

    console.log(`[sync] ✅ Synced ${rows.length} campaigns for account: ${accountId}`);
    return { accountId, synced: rows.length, customerId };
}



// Get sub-accounts from database
export async function getSubAccountsFromDB(customerId?: string) {
    try {
        const whereClause: any = { isActive: true };

        if (customerId) {
            whereClause.customerId = customerId;
        }

        const subAccounts = await prisma.subAccount.findMany({
            where: whereClause,
            orderBy: { descriptiveName: 'asc' }
        });

        return subAccounts;
    } catch (error: any) {
        console.error("❌ [DB] Error fetching sub-accounts:", error.message);
        return [];
    }
}
