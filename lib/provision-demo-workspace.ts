import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import FacebookUser from "@/models/FacebookUser";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import Campaign from "@/models/Campaign";
import SeoReport from "@/models/SeoReport";

type DemoPlanConfig = {
  metaAccountPageCounts: number[];
  googleAdsAccountCount: number;
  seoPropertyCount: number;
  campaignsPerGoogleAccount: number;
  seoRowsPerProperty: number;
};

const DEFAULT_DEMO_PLAN_CONFIG: DemoPlanConfig = {
  metaAccountPageCounts: [100],
  googleAdsAccountCount: 100,
  seoPropertyCount: 100,
  campaignsPerGoogleAccount: 100,
  seoRowsPerProperty: 100,
};

const DEMO_PLAN_CONFIGS: Record<string, DemoPlanConfig> = {
  "plan 1": {
    metaAccountPageCounts: [100],
    googleAdsAccountCount: 100,
    seoPropertyCount: 100,
    campaignsPerGoogleAccount: 100,
    seoRowsPerProperty: 100,
  },
  "plan 2": {
    metaAccountPageCounts: [100, 50],
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

function getDemoPlanConfig(planName: unknown): DemoPlanConfig {
  return DEMO_PLAN_CONFIGS[String(planName || "").trim().toLowerCase()] || DEFAULT_DEMO_PLAN_CONFIG;
}

function slugify(value: unknown) {
  return String(value || "demo")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "demo";
}

function buildNumericBase(id: string) {
  const hex = String(id || "").slice(-8) || "12345678";
  return String(parseInt(hex, 16)).padStart(8, "0").slice(0, 8);
}

function buildDateOffset(daysBack: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d;
}

type ProvisionDemoWorkspaceParams = {
  userId: string;
  planName: string;
};

export async function provisionDemoWorkspaceForUser(params: ProvisionDemoWorkspaceParams) {
  const { userId, planName } = params;
  await connectDB();

  const requestedUser = await User.findById(userId)
    .select({ _id: 1, role: 1, parent_client_id: 1 })
    .lean();

  if (!requestedUser) {
    throw new Error("Demo provisioning user not found.");
  }

  const clientId =
    requestedUser.role === "user" && requestedUser.parent_client_id
      ? String(requestedUser.parent_client_id)
      : String(requestedUser._id);

  const client = await User.findById(clientId)
    .select({ _id: 1, name: 1, email: 1, agencyWebsite: 1, role: 1 })
    .lean();

  if (!client || client.role !== "client") {
    throw new Error("Demo provisioning client not found.");
  }

  const config = getDemoPlanConfig(planName);
  const clientObjectId = new mongoose.Types.ObjectId(clientId);
  const numericBase = buildNumericBase(clientId);
  const websiteBase = slugify(client.agencyWebsite || client.name || client.email);
  const metaAccountNames =
    String(planName || "").trim().toLowerCase() === "plan 2"
      ? ["Vispan Solutions", "Sun Enterprise"]
      : [];

  const pageIds: mongoose.Types.ObjectId[] = [];
  const instagramIds: mongoose.Types.ObjectId[] = [];
  const adIds: mongoose.Types.ObjectId[] = [];
  const googleAdsIds: mongoose.Types.ObjectId[] = [];
  const gscIds: mongoose.Types.ObjectId[] = [];

  for (let metaIndex = 0; metaIndex < config.metaAccountPageCounts.length; metaIndex += 1) {
    const metaAccountNumber = metaIndex + 1;
    const pageCount = config.metaAccountPageCounts[metaIndex];
    const metaAccountName = metaAccountNames[metaIndex] || `${client.name || "Client"} Demo Meta ${metaAccountNumber}`;
    const metaSlug = slugify(metaAccountName);

    const facebookUser = await FacebookUser.findOneAndUpdate(
      { facebookId: `demo-fb-${clientId}-${metaAccountNumber}` },
      {
        $set: {
          adminId: clientId,
          email: client.email || null,
          name: metaAccountName,
          accessToken: `demo-token-${clientId}-${metaAccountNumber}`,
          tokenType: "bearer",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          state: "demo-provision",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const adAccountCode = `act_${numericBase}${String(metaAccountNumber).padStart(2, "0")}`;
    const adAccount = await AdAccount.findOneAndUpdate(
      { adAccountId: adAccountCode },
      {
        $set: {
          userId: facebookUser._id,
          name: `${metaAccountName} Meta Ad ${metaAccountNumber}`,
          account_status: 1,
          currency: "INR",
          timezone_name: "Asia/Kolkata",
          accessToken: `demo-ad-token-${clientId}-${metaAccountNumber}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    adIds.push(adAccount._id);

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      const globalPageNumber = pageIds.length + 1;
      const page = await Page.findOneAndUpdate(
        { pageId: `demo-page-${clientId}-${metaAccountNumber}-${pageIndex}` },
        {
          $set: {
            userId: facebookUser._id,
            link: `https://facebook.com/${metaSlug}-page-${pageIndex}`,
            name: `${metaAccountName} Facebook Page ${pageIndex}`,
            accessToken: `demo-page-token-${clientId}-${metaAccountNumber}-${pageIndex}`,
            category: "Marketing Agency",
            about: `Demo Facebook page ${pageIndex} for ${metaAccountName}.`,
            page_token: `demo-page-token-${clientId}-${metaAccountNumber}-${pageIndex}`,
            picture: `https://api.dicebear.com/9.x/shapes/svg?seed=${clientId}-page-${globalPageNumber}`,
            category_list: [],
            otherFields: {
              source: "demo-provision",
              metaAccountNumber,
              pageIndex,
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      pageIds.push(page._id);

      const instagramAccount = await InstagramAccount.findOneAndUpdate(
        { igId: `demo-ig-${clientId}-${metaAccountNumber}-${pageIndex}` },
        {
          $set: {
            userId: facebookUser._id,
            username: `${metaSlug}_ig_${pageIndex}`,
            profile_picture_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${clientId}-ig-${globalPageNumber}`,
            followers_count: 1200 + globalPageNumber * 10,
            follows_count: 180 + (globalPageNumber % 70),
            media_count: 45 + (globalPageNumber % 40),
            pageId: `demo-page-${clientId}-${metaAccountNumber}-${pageIndex}`,
            name: `${metaAccountName} Instagram ${pageIndex}`,
            pageAccessToken: `demo-ig-token-${clientId}-${metaAccountNumber}-${pageIndex}`,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      instagramIds.push(instagramAccount._id);
    }
  }

  for (let index = 1; index <= config.googleAdsAccountCount; index += 1) {
    const customerId = `${numericBase}${String(index).padStart(2, "0")}`;
    const googleAdsAccount = await GoogleAdsAccount.findOneAndUpdate(
      { accountId: customerId, customerId },
      {
        $set: {
          descriptiveName: `${client.name || "Client"} Google Ads ${index}`,
          manager: false,
          level: "ACCOUNT",
          timeZone: "Asia/Kolkata",
          resourceName: `customers/${customerId}`,
          adminId: null,
          googleUserId: null,
          userEmail: client.email || null,
          isActive: true,
          lastSynced: new Date(),
          accessToken: null,
          refreshToken: null,
          scope: "demo",
          tokenType: null,
          expiresAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    googleAdsIds.push(googleAdsAccount._id);

    for (let campaignIndex = 1; campaignIndex <= config.campaignsPerGoogleAccount; campaignIndex += 1) {
      const campaignId = `${customerId}${String(campaignIndex).padStart(3, "0")}`;
      const clicks = 25 + ((campaignIndex * 7) % 90);
      const impressions = clicks * (12 + (campaignIndex % 5));
      const conversions = Math.max(1, Math.floor(clicks / 6));
      const costMicros = String(clicks * 7500000 + campaignIndex * 100000);

      await Campaign.findOneAndUpdate(
        { campaignId, customerId },
        {
          $set: {
            userId: clientObjectId,
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
            subAccountId: googleAdsAccount._id,
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  for (let index = 1; index <= config.seoPropertyCount; index += 1) {
    const siteUrl =
      index === 1 ? `https://${websiteBase}.demo/` : `https://${websiteBase}-${index}.demo/`;

    const gscAccount = await GoogleSearchConsoleAccount.findOneAndUpdate(
      { siteUrl, adminId: null },
      {
        $set: {
          permissionLevel: "siteOwner",
          adminId: null,
          googleUserId: null,
          userEmail: client.email || null,
          isActive: true,
          lastSynced: new Date(),
          accessToken: null,
          refreshToken: null,
          scope: "demo",
          tokenType: null,
          expiresAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    gscIds.push(gscAccount._id);

    for (let rowIndex = 1; rowIndex <= config.seoRowsPerProperty; rowIndex += 1) {
      const date = buildDateOffset(rowIndex % 30);
      const clicks = 5 + ((rowIndex * 3) % 80);
      const impressions = clicks * (14 + (rowIndex % 7));

      await SeoReport.findOneAndUpdate(
        {
          userId: clientObjectId,
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
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  await User.findByIdAndUpdate(clientObjectId, {
    $set: {
      pages: pageIds,
      instagramAccounts: instagramIds,
      adAccounts: adIds,
      googleAdsAccounts: googleAdsIds,
      googleSearchConsoleAccounts: gscIds,
      mainPage: pageIds[0] || null,
      mainInstagram: instagramIds[0] || null,
      mainAd: adIds[0] || null,
      mainGoogleAd: googleAdsIds[0] || null,
      mainSEOsites: gscIds[0] || null,
    },
  });

  await User.updateMany(
    {
      parent_client_id: clientObjectId,
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
        instagramAccounts: instagramIds,
        adAccounts: adIds,
        googleAdsAccounts: googleAdsIds,
        googleSearchConsoleAccounts: gscIds,
        mainPage: pageIds[0] || null,
        mainInstagram: instagramIds[0] || null,
        mainAd: adIds[0] || null,
        mainGoogleAd: googleAdsIds[0] || null,
        mainSEOsites: gscIds[0] || null,
      },
    }
  );

  return {
    clientId,
    planName,
    metaAccounts: config.metaAccountPageCounts.length,
    facebookPages: pageIds.length,
    instagramAccounts: instagramIds.length,
    metaAdAccounts: adIds.length,
    googleAdsAccounts: googleAdsIds.length,
    seoProperties: gscIds.length,
    campaignsPerGoogleAccount: config.campaignsPerGoogleAccount,
    seoRowsPerProperty: config.seoRowsPerProperty,
  };
}
