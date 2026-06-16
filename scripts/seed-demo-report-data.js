#!/usr/bin/env node
require("dotenv").config({ path: ".env" });

const mongoose = require("mongoose");

const DEFAULT_DEMO_PLAN_CONFIG = {
  metaAccountPageCounts: [100],
  googleAdsAccountCount: 100,
  seoPropertyCount: 100,
  campaignsPerGoogleAccount: 100,
  seoRowsPerProperty: 100,
};

const DEMO_PLAN_CONFIGS = {
  "plan 1": {
    metaAccountPageCounts: [100],
    googleAdsAccountCount: 100,
    seoPropertyCount: 100,
    campaignsPerGoogleAccount: 100,
    seoRowsPerProperty: 100,
  },
  "plan 2": {
    metaAccountPageCounts: [150, 50],
    googleAdsAccountCount: 200,
    seoPropertyCount: 200,
    campaignsPerGoogleAccount: 100,
    seoRowsPerProperty: 100,
  },
  "own plan": {
    metaAccountPageCounts: [200, 150, 100],
    googleAdsAccountCount: 300,
    seoPropertyCount: 300,
    campaignsPerGoogleAccount: 100,
    seoRowsPerProperty: 100,
  },
  custom: {
    metaAccountPageCounts: [200, 150, 100],
    googleAdsAccountCount: 300,
    seoPropertyCount: 300,
    campaignsPerGoogleAccount: 100,
    seoRowsPerProperty: 100,
  },
};

function getDemoPlanConfig(planName) {
  return DEMO_PLAN_CONFIGS[String(planName || "").trim().toLowerCase()] || DEFAULT_DEMO_PLAN_CONFIG;
}

function slugify(value) {
  return String(value || "demo")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "demo";
}

function buildNumericBase(id) {
  const hex = String(id || "").slice(-8) || "12345678";
  return String(parseInt(hex, 16)).padStart(8, "0").slice(0, 8);
}

function buildDateOffset(daysBack) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d;
}

function getDoc(result) {
  return result && result.value ? result.value : result;
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_FALLBACK;
  if (!uri) {
    throw new Error("Missing MONGODB_URI / MONGODB_URI_FALLBACK");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const ObjectId = mongoose.Types.ObjectId;

  const users = db.collection("users");
  const subscriptions = db.collection("subscriptions");
  const plans = db.collection("plans");
  const facebookUsers = db.collection("facebookusers");
  const pages = db.collection("pages");
  const instagramAccounts = db.collection("instagramaccounts");
  const adAccounts = db.collection("adaccounts");
  const googleAdsAccounts = db.collection("googleadsaccounts");
  const gscAccounts = db.collection("googlesearchconsoleaccounts");
  const campaigns = db.collection("campaigns");
  const seoReports = db.collection("seoreports");

  const clientDocs = await users.find({ role: "client" }).toArray();
  const subscriptionsById = new Map(
    (await subscriptions.find({}).toArray()).map((sub) => [String(sub._id), sub])
  );
  const plansById = new Map(
    (await plans.find({}).toArray()).map((plan) => [String(plan._id), plan])
  );

  const summaries = [];

  for (const client of clientDocs) {
    const subscription = subscriptionsById.get(String(client.activeSubscription || ""));
    if (!subscription || subscription.status !== "active") continue;

    const plan = plansById.get(String(subscription.planId || ""));
    if (!plan) continue;

    const planName = String(plan.name || "");
    const config = getDemoPlanConfig(planName);
    const numericBase = buildNumericBase(client._id);
    const websiteBase = slugify(client.agencyWebsite || client.name || client.email);

    const pageIds = [];
    const instaIds = [];
    const adIds = [];
    const googleAdIds = [];
    const gscIds = [];

    for (let metaIndex = 0; metaIndex < config.metaAccountPageCounts.length; metaIndex += 1) {
      const metaAccountNumber = metaIndex + 1;
      const pageCount = config.metaAccountPageCounts[metaIndex];

      const fbResult = await facebookUsers.findOneAndUpdate(
        { facebookId: `demo-fb-${client._id}-${metaAccountNumber}` },
        {
          $set: {
            adminId: String(client._id),
            email: client.email || null,
            name: `${client.name || "Client"} Demo Meta ${metaAccountNumber}`,
            accessToken: `demo-token-${client._id}-${metaAccountNumber}`,
            tokenType: "bearer",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            state: "demo-seed",
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );
      const fbUserId = getDoc(fbResult)._id;

      const adAccountCode = `act_${numericBase}${String(metaAccountNumber).padStart(2, "0")}`;
      const adResult = await adAccounts.findOneAndUpdate(
        { adAccountId: adAccountCode },
        {
          $set: {
            userId: fbUserId,
            name: `${client.name || "Client"} Meta Ad ${metaAccountNumber}`,
            account_status: 1,
            currency: "INR",
            timezone_name: "Asia/Kolkata",
            accessToken: `demo-ad-token-${client._id}-${metaAccountNumber}`,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );
      adIds.push(getDoc(adResult)._id);

      for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        const globalPageNumber = pageIds.length + 1;
        const pageResult = await pages.findOneAndUpdate(
          { pageId: `demo-page-${client._id}-${metaAccountNumber}-${pageIndex}` },
          {
            $set: {
              userId: fbUserId,
              link: `https://facebook.com/${websiteBase}-page-${globalPageNumber}`,
              name: `${client.name || "Client"} Facebook Page ${globalPageNumber}`,
              accessToken: `demo-page-token-${client._id}-${metaAccountNumber}-${pageIndex}`,
              category: "Marketing Agency",
              about: `Demo Facebook page ${globalPageNumber} for ${client.name || "client"}.`,
              page_token: `demo-page-token-${client._id}-${metaAccountNumber}-${pageIndex}`,
              picture: `https://api.dicebear.com/9.x/shapes/svg?seed=${client._id}-page-${globalPageNumber}`,
              category_list: [],
              otherFields: {
                source: "demo-seed",
                metaAccountNumber,
                pageIndex,
              },
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, returnDocument: "after" }
        );
        pageIds.push(getDoc(pageResult)._id);

        const instaResult = await instagramAccounts.findOneAndUpdate(
          { igId: `demo-ig-${client._id}-${metaAccountNumber}-${pageIndex}` },
          {
            $set: {
              userId: fbUserId,
              username: `${websiteBase}_ig_${globalPageNumber}`,
              profile_picture_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${client._id}-ig-${globalPageNumber}`,
              followers_count: 1200 + globalPageNumber * 10,
              follows_count: 180 + (globalPageNumber % 70),
              media_count: 45 + (globalPageNumber % 40),
              pageId: `demo-page-${client._id}-${metaAccountNumber}-${pageIndex}`,
              name: `${client.name || "Client"} Instagram ${globalPageNumber}`,
              pageAccessToken: `demo-ig-token-${client._id}-${metaAccountNumber}-${pageIndex}`,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, returnDocument: "after" }
        );
        instaIds.push(getDoc(instaResult)._id);
      }
    }

    for (let index = 1; index <= config.googleAdsAccountCount; index += 1) {
      const customerId = `${numericBase}${String(index).padStart(2, "0")}`;
      const googleAccountResult = await googleAdsAccounts.findOneAndUpdate(
        { accountId: customerId, customerId },
        {
          $set: {
            descriptiveName: `${client.name || "Client"} Google Ads ${index}`,
            manager: false,
            level: "ACCOUNT",
            timeZone: "Asia/Kolkata",
            resourceName: `customers/${customerId}`,
            adminId: new ObjectId(String(client._id)),
            userEmail: client.email || null,
            isActive: true,
            lastSynced: new Date(),
            accessToken: "demo-google-ads-token",
            refreshToken: "demo-google-ads-refresh",
            scope: "demo",
            tokenType: "Bearer",
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );
      googleAdIds.push(getDoc(googleAccountResult)._id);

      for (let campaignIndex = 1; campaignIndex <= config.campaignsPerGoogleAccount; campaignIndex += 1) {
        const campaignId = `${customerId}${String(campaignIndex).padStart(3, "0")}`;
        const clicks = 25 + ((campaignIndex * 7) % 90);
        const impressions = clicks * (12 + (campaignIndex % 5));
        const conversions = Math.max(1, Math.floor(clicks / 6));
        const costMicros = String(clicks * 7500000 + campaignIndex * 100000);

        await campaigns.findOneAndUpdate(
          { campaignId, customerId },
          {
            $set: {
              userId: new ObjectId(String(client._id)),
              userEmail: client.email || null,
              name: `${client.name || "Client"} Campaign ${index}-${campaignIndex}`,
              status: campaignIndex % 9 === 0 ? "PAUSED" : "ENABLED",
              advertisingChannelType:
                campaignIndex % 3 === 0
                  ? "DISPLAY"
                  : campaignIndex % 2 === 0
                  ? "SEARCH"
                  : "PERFORMANCE_MAX",
              campaignBudgetAmountMicros: String(50000000 + campaignIndex * 1000000),
              metrics: {
                clicks,
                impressions,
                conversions,
                ctr: Number((clicks / impressions).toFixed(4)),
                costMicros,
              },
              biddingStrategyType: "MAXIMIZE_CONVERSIONS",
              subAccountId: getDoc(googleAccountResult)._id,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }
    }

    for (let index = 1; index <= config.seoPropertyCount; index += 1) {
      const siteUrl =
        index === 1 ? `https://${websiteBase}.demo/` : `https://${websiteBase}-${index}.demo/`;

      const gscResult = await gscAccounts.findOneAndUpdate(
        { siteUrl, adminId: new ObjectId(String(client._id)) },
        {
          $set: {
            permissionLevel: "siteOwner",
            googleUserId: null,
            userEmail: client.email || null,
            isActive: true,
            lastSynced: new Date(),
            accessToken: "demo-search-console-token",
            refreshToken: "demo-search-console-refresh",
            scope: "demo",
            tokenType: "Bearer",
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );
      gscIds.push(getDoc(gscResult)._id);

      for (let rowIndex = 1; rowIndex <= config.seoRowsPerProperty; rowIndex += 1) {
        const date = buildDateOffset(rowIndex % 30);
        const clicks = 5 + ((rowIndex * 3) % 80);
        const impressions = clicks * (14 + (rowIndex % 7));
        await seoReports.findOneAndUpdate(
          {
            userId: new ObjectId(String(client._id)),
            siteUrl,
            query: `demo keyword ${index}-${rowIndex}`,
            page: `${siteUrl}service-${(rowIndex % 12) + 1}`,
            date,
            country: rowIndex % 2 === 0 ? "india" : "united states",
            device: rowIndex % 3 === 0 ? "mobile" : rowIndex % 3 === 1 ? "desktop" : "tablet",
          },
          {
            $set: {
              clicks,
              impressions,
              ctr: Number((clicks / impressions).toFixed(4)),
              position: Number((1 + (rowIndex % 25) * 0.6).toFixed(2)),
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }
    }

    await users.updateOne(
      { _id: new ObjectId(String(client._id)) },
      {
        $set: {
          pages: pageIds,
          instagramAccounts: instaIds,
          adAccounts: adIds,
          googleAdsAccounts: googleAdIds,
          googleSearchConsoleAccounts: gscIds,
          mainPage: pageIds[0] || null,
          mainInstagram: instaIds[0] || null,
          mainAd: adIds[0] || null,
          mainGoogleAd: googleAdIds[0] || null,
          mainSEOsites: gscIds[0] || null,
        },
      }
    );

    await users.updateMany(
      {
        parent_client_id: new ObjectId(String(client._id)),
        role: "user",
        $or: [
          { mainPage: { $exists: false } },
          { mainPage: null },
          { mainInstagram: { $exists: false } },
          { mainInstagram: null },
          { mainAd: { $exists: false } },
          { mainAd: null },
          { mainGoogleAd: { $exists: false } },
          { mainGoogleAd: null },
          { mainSEOsites: { $exists: false } },
          { mainSEOsites: null },
        ],
      },
      {
        $set: {
          pages: pageIds,
          instagramAccounts: instaIds,
          adAccounts: adIds,
          googleAdsAccounts: googleAdIds,
          googleSearchConsoleAccounts: gscIds,
          mainPage: pageIds[0] || null,
          mainInstagram: instaIds[0] || null,
          mainAd: adIds[0] || null,
          mainGoogleAd: googleAdIds[0] || null,
          mainSEOsites: gscIds[0] || null,
        },
      }
    );

    summaries.push({
      client: client.name || client.email,
      plan: planName,
      metaAccounts: config.metaAccountPageCounts.length,
      facebookPages: pageIds.length,
      instagramAccounts: instaIds.length,
      metaAdAccounts: adIds.length,
      googleAdsAccounts: googleAdIds.length,
      seoProperties: gscIds.length,
      campaignsPerGoogleAccount: config.campaignsPerGoogleAccount,
      seoRowsPerProperty: config.seoRowsPerProperty,
    });
  }

  console.log(JSON.stringify({ ok: true, summaries }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // noop
  }
  process.exit(1);
});
