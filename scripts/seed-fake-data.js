/**
 * Fake Data Seed Script for Demo Accounts
 * Run: node scripts/seed-fake-data.js
 *
 * Injects realistic fake data for:
 *  - FacebookUser
 *  - Facebook Pages + PageInsights + PagePosts
 *  - Instagram Accounts + InstagramInsights
 *  - Ad Accounts + AdAccountInsights
 *  - Google Ads Accounts + GoogleAdsInsights
 *  - Google Search Console Accounts
 *  - SEO Reports
 * All linked to demo client (client@demo.com)
 */

const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/analytics";

// ─── Helper ──────────────────────────────────────────────────────────────────

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Generate last 30 days of date strings
function last30Days() {
    return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split("T")[0];
    });
}

// Build daily history array for page/ad insights
function buildHistory(days = 30) {
    return last30Days().map(date => ({
        date,
        impressions: rand(500, 8000),
        reach: rand(300, 6000),
        engaged_users: rand(50, 1200),
        page_views_total: rand(100, 3000),
        new_likes: rand(5, 150),
        post_impressions: rand(200, 5000),
    }));
}

function buildAdHistory(days = 30) {
    return last30Days().map(date => ({
        date,
        impressions: rand(1000, 20000),
        clicks: rand(50, 800),
        spend: randFloat(10, 500),
        reach: rand(800, 15000),
        cpm: randFloat(2, 20),
        cpc: randFloat(0.3, 5),
        ctr: randFloat(0.5, 5),
        conversions: rand(0, 80),
        roas: randFloat(1, 8),
    }));
}

function buildGoogleAdsHistory() {
    return last30Days().map(date => ({
        metric: {
            date,
            impressions: rand(500, 15000),
            clicks: rand(20, 500),
            cost_micros: rand(1000000, 30000000),
            conversions: rand(0, 50),
            ctr: randFloat(0.5, 8),
            average_cpc: rand(500000, 5000000),
        },
        archivedAt: new Date(),
    }));
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const schemas = {};

schemas.User = new mongoose.Schema({
    name: String, email: String, role: String,
    isAdmin: Boolean, activeSubscription: mongoose.Schema.Types.ObjectId,
    parent_client_id: mongoose.Schema.Types.ObjectId,
    pages: [mongoose.Schema.Types.ObjectId], adAccounts: [mongoose.Schema.Types.ObjectId],
    instagramAccounts: [mongoose.Schema.Types.ObjectId],
    googleSearchConsoleAccounts: [mongoose.Schema.Types.ObjectId],
    googleAdsAccounts: [mongoose.Schema.Types.ObjectId],
    seoReports: [mongoose.Schema.Types.ObjectId],
    mainPage: mongoose.Schema.Types.ObjectId, mainInstagram: mongoose.Schema.Types.ObjectId,
    mainAd: mongoose.Schema.Types.ObjectId, mainGoogleAd: mongoose.Schema.Types.ObjectId,
    mainSEOsites: mongoose.Schema.Types.ObjectId,
    client_id: String, contact_id: String, ERP_token: String,
    password: String, image: String,
}, { timestamps: true });

schemas.FacebookUser = new mongoose.Schema({
    facebookId: { type: String, required: true, unique: true },
    adminId: String, email: String, name: String,
    accessToken: { type: String, required: true },
    tokenType: String, expiresAt: Date, state: String,
}, { timestamps: true });

schemas.Page = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    pageId: String, link: String, name: String,
    accessToken: String, category: String, about: String,
    page_token: String, picture: String,
    category_list: Object, otherFields: Object,
    insights: mongoose.Schema.Types.ObjectId,
    posts: [mongoose.Schema.Types.ObjectId],
}, { timestamps: true });

schemas.PageInsights = new mongoose.Schema({
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', unique: true },
    metric: Object, history: Object,
}, { timestamps: true });

schemas.PagePost = new mongoose.Schema({
    pageId: mongoose.Schema.Types.ObjectId,
    metric: Object, history: Object,
    postid: String, created_time: String,
    full_picture: String, permalink_url: String,
    createdAt: { type: Date, default: Date.now },
});

schemas.InstagramAccount = new mongoose.Schema({
    igId: String, username: String, profile_picture_url: String,
    followers_count: Number, follows_count: Number, media_count: Number,
    pageId: String, name: String, pageAccessToken: String,
    userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

schemas.InstagramInsights = new mongoose.Schema({
    instagramAccountId: mongoose.Schema.Types.ObjectId,
    metric: Object, history: Object,
    createdAt: { type: Date, default: Date.now },
});

schemas.AdAccount = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    adAccountId: String, name: String,
    account_status: Number, currency: String,
    timezone_name: String, accessToken: String,
}, { timestamps: true });

schemas.AdAccountInsights = new mongoose.Schema({
    adAccountId: mongoose.Schema.Types.ObjectId,
    name: String, fbEntityId: String,
    adsetname: String, adsetid: String,
    metric: Object, history: Object,
    createdAt: { type: Date, default: Date.now },
});

schemas.GoogleAdsAccount = new mongoose.Schema({
    accountId: { type: String, required: true },
    descriptiveName: String, manager: Boolean, level: String,
    timeZone: String, resourceName: String, customerId: String,
    adminId: mongoose.Schema.Types.ObjectId,
    googleUserId: mongoose.Schema.Types.ObjectId,
    userEmail: String, isActive: Boolean,
    lastSynced: Date, accessToken: String, refreshToken: String,
    scope: String, expiresAt: Number, tokenType: String,
}, { timestamps: true });

schemas.GoogleAdsInsight = new mongoose.Schema({
    googleAdsAccountId: mongoose.Schema.Types.ObjectId,
    campaignId: String, customerId: String, name: String,
    dateRange: { since: String, until: String },
    metric: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: { type: [{ metric: mongoose.Schema.Types.Mixed, archivedAt: Date }], default: [] },
}, { timestamps: true });

schemas.GoogleSearchConsoleAccount = new mongoose.Schema({
    siteUrl: { type: String, required: true },
    permissionLevel: { type: String, required: true },
    adminId: mongoose.Schema.Types.ObjectId,
    googleUserId: mongoose.Schema.Types.ObjectId,
    userEmail: String, isActive: Boolean, lastSynced: Date,
    accessToken: String, refreshToken: String,
    scope: String, expiresAt: Number, tokenType: String,
}, { timestamps: true });

schemas.SeoReport = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    siteUrl: { type: String, required: true },
    query: String, page: String, country: String, device: String,
    clicks: Number, impressions: Number, ctr: Number, position: Number,
    date: { type: Date, required: true },
}, { timestamps: true });

// ─── Models ──────────────────────────────────────────────────────────────────

function getModel(name) {
    delete mongoose.models[name];
    return mongoose.model(name, schemas[name]);
}

// ─── Config Data ─────────────────────────────────────────────────────────────

const FB_PAGES = [
    { name: "Vispan Solutions", category: "Marketing Agency", about: "Digital marketing & analytics agency.", handle: "vispansolutions" },
    { name: "TechNova India", category: "Technology", about: "Cutting-edge tech products for India.", handle: "technovaindia" },
    { name: "GrowFast Store", category: "E-Commerce", about: "Your one-stop online shopping destination.", handle: "growfaststore" },
];

const IG_ACCOUNTS = [
    { username: "vispan.solutions", name: "Vispan Solutions", followers: rand(12000, 45000) },
    { username: "technovaofficial", name: "TechNova India", followers: rand(8000, 30000) },
    { username: "growfast.store", name: "GrowFast Store", followers: rand(5000, 20000) },
];

const AD_ACCOUNTS = [
    { name: "Vispan – Brand Awareness", currency: "INR" },
    { name: "TechNova – Lead Gen", currency: "INR" },
    { name: "GrowFast – Conversions", currency: "USD" },
];

const GOOGLE_ADS_ACCOUNTS = [
    { name: "Vispan Google Ads", accountId: "demo-gads-001", customerId: "1234567890" },
    { name: "TechNova Search Campaigns", accountId: "demo-gads-002", customerId: "0987654321" },
];

const SEO_DOMAINS = [
    "https://vispan.ai",
    "https://technovaindia.com",
    "https://growfaststore.in",
];

const SEO_QUERIES = [
    "digital marketing agency", "seo services india", "google ads management",
    "facebook ads expert", "instagram marketing", "analytics dashboard",
    "social media management", "content marketing", "ppc advertising",
    "ecommerce marketing", "brand awareness campaigns", "lead generation",
    "conversion rate optimization", "email marketing", "influencer marketing",
];

const SEO_PAGES = [
    "/", "/services", "/blog", "/contact", "/about",
    "/services/seo", "/services/social-media", "/blog/digital-marketing-tips",
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    const User = getModel("User");

    // Find demo client
    const client = await User.findOne({ email: "client@demo.com" }).lean();
    if (!client) {
        console.error("❌ Demo client (client@demo.com) not found! Run seed-demo-accounts.js first.");
        process.exit(1);
    }
    const clientId = String(client._id);
    console.log("✅ Found demo client:", clientId);

    // Find demo user
    const demoUser = await User.findOne({ email: "test@demo.com" }).lean();
    const userId = demoUser ? String(demoUser._id) : null;
    if (userId) console.log("✅ Found demo user:", userId);

    const FacebookUser = getModel("FacebookUser");
    const Page = getModel("Page");
    const PageInsights = getModel("PageInsights");
    const PagePost = getModel("PagePost");
    const InstagramAccount = getModel("InstagramAccount");
    const InstagramInsights = getModel("InstagramInsights");
    const AdAccount = getModel("AdAccount");
    const AdAccountInsights = getModel("AdAccountInsights");
    const GoogleAdsAccount = getModel("GoogleAdsAccount");
    const GoogleAdsInsight = getModel("GoogleAdsInsight");
    const GoogleSearchConsoleAccount = getModel("GoogleSearchConsoleAccount");
    const SeoReport = getModel("SeoReport");

    // ── Clean old demo data for this client ────────────────────────────────────
    console.log("\n🧹 Cleaning old demo data...");
    await FacebookUser.deleteMany({ adminId: clientId });
    await Page.deleteMany({ userId: new mongoose.Types.ObjectId(clientId) });
    await InstagramAccount.deleteMany({ userId: new mongoose.Types.ObjectId(clientId) });
    await AdAccount.deleteMany({ userId: new mongoose.Types.ObjectId(clientId) });
    if (userId) {
        await SeoReport.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
        await Page.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    }

    const allPages = [];
    const allIgAccounts = [];
    const allAdAccounts = [];
    const allGoogleAdsAccounts = [];
    const allGscAccounts = [];
    const allSeoReports = [];

    // ── 1. FacebookUser ────────────────────────────────────────────────────────
    const fbUser = await FacebookUser.create({
        facebookId: `demo_fb_${clientId.slice(-6)}`,
        adminId: clientId,
        email: "client@demo.com",
        name: "Demo Client",
        accessToken: "DEMO_FB_ACCESS_TOKEN_FAKE_12345",
        tokenType: "bearer",
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });
    console.log("✅ FacebookUser created");

    // ── 2. Facebook Pages ──────────────────────────────────────────────────────
    for (let i = 0; i < FB_PAGES.length; i++) {
        const p = FB_PAGES[i];
        const fakeId = `demo_page_${i + 1}_${clientId.slice(-4)}`;

        // PageInsights
        const insight = await PageInsights.create({
            metric: {
                page_fans: rand(5000, 80000),
                page_views_total: rand(1000, 20000),
                page_impressions: rand(10000, 200000),
                page_reach: rand(5000, 100000),
                page_engaged_users: rand(500, 10000),
                page_post_engagements: rand(300, 8000),
                page_video_views: rand(200, 5000),
                new_likes: rand(50, 2000),
                page_fans_country: { IN: rand(3000, 50000), US: rand(500, 5000), GB: rand(200, 2000) },
                page_fans_city: { "Ahmedabad": rand(1000, 10000), "Mumbai": rand(800, 8000), "Delhi": rand(600, 7000) },
                page_fans_gender_age: {
                    "M.18-24": rand(500, 5000), "M.25-34": rand(800, 8000),
                    "F.18-24": rand(400, 4000), "F.25-34": rand(600, 6000),
                },
            },
            history: buildHistory(),
        });

        // PagePosts (3 per page)
        const postIds = [];
        for (let j = 0; j < 3; j++) {
            const post = await PagePost.create({
                postid: `${fakeId}_post_${j + 1}`,
                created_time: daysAgo(rand(1, 20)).toISOString(),
                full_picture: `https://picsum.photos/seed/${fakeId}_${j}/600/400`,
                permalink_url: `https://www.facebook.com/${p.handle}/posts/demo${j + 1}`,
                metric: {
                    post_impressions: rand(500, 10000),
                    post_reach: rand(300, 7000),
                    post_engaged_users: rand(50, 1500),
                    post_reactions_like_total: rand(20, 500),
                    post_reactions_love_total: rand(5, 100),
                    post_comments: rand(2, 80),
                    post_shares: rand(1, 50),
                    post_clicks: rand(30, 800),
                },
                history: [
                    { date: daysAgo(0).toISOString(), impressions: rand(100, 500) },
                    { date: daysAgo(1).toISOString(), impressions: rand(100, 500) },
                    { date: daysAgo(2).toISOString(), impressions: rand(100, 500) },
                ],
            });
            postIds.push(post._id);
        }

        // Page
        const page = await Page.create({
            userId: new mongoose.Types.ObjectId(clientId),
            pageId: fakeId,
            link: `https://www.facebook.com/${p.handle}`,
            name: p.name,
            category: p.category,
            about: p.about,
            accessToken: "DEMO_PAGE_TOKEN_FAKE",
            page_token: "DEMO_PAGE_TOKEN_FAKE",
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=4267B2&color=fff&size=128`,
            category_list: [{ id: `cat_${i}`, name: p.category }],
            otherFields: { fan_count: rand(5000, 80000), rating_count: rand(10, 500) },
            insights: insight._id,
            posts: postIds,
        });

        // Link pageId back to insight
        insight.pageId = page._id;
        await insight.save();
        for (const postId of postIds) {
            await PagePost.findByIdAndUpdate(postId, { pageId: page._id });
        }

        allPages.push(page._id);
        console.log(`  ✅ FB Page: ${p.name}`);
    }

    // ── 3. Instagram Accounts ──────────────────────────────────────────────────
    for (let i = 0; i < IG_ACCOUNTS.length; i++) {
        const ig = IG_ACCOUNTS[i];
        const fakeIgId = `demo_ig_${i + 1}_${clientId.slice(-4)}`;

        const igInsight = await InstagramInsights.create({
            metric: {
                followers_count: ig.followers,
                follows_count: rand(500, 3000),
                media_count: rand(50, 400),
                impressions: rand(10000, 200000),
                reach: rand(5000, 100000),
                profile_views: rand(1000, 20000),
                website_clicks: rand(200, 5000),
                accounts_engaged: rand(500, 10000),
                total_interactions: rand(1000, 30000),
                likes: rand(500, 15000),
                comments: rand(50, 2000),
                shares: rand(20, 1000),
                saves: rand(100, 3000),
                audience_country: { IN: rand(3000, 50000), US: rand(500, 5000) },
                audience_gender_age: {
                    "M.18-24": rand(200, 3000), "M.25-34": rand(400, 5000),
                    "F.18-24": rand(300, 4000), "F.25-34": rand(500, 6000),
                },
                audience_city: { "Ahmedabad": rand(500, 8000), "Mumbai": rand(400, 6000), "Delhi": rand(300, 5000) },
            },
            history: last30Days().map(date => ({
                date,
                impressions: rand(300, 8000),
                reach: rand(200, 5000),
                profile_views: rand(50, 1000),
                followers_count: ig.followers + rand(-100, 200),
                likes: rand(30, 800),
                comments: rand(5, 100),
                shares: rand(2, 50),
                saves: rand(10, 200),
            })),
        });

        const igAccount = await InstagramAccount.create({
            igId: fakeIgId,
            username: ig.username,
            profile_picture_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(ig.name)}&background=E1306C&color=fff&size=128&rounded=true`,
            followers_count: ig.followers,
            follows_count: rand(500, 3000),
            media_count: rand(50, 400),
            pageId: `demo_page_${i + 1}_${clientId.slice(-4)}`,
            name: ig.name,
            pageAccessToken: "DEMO_IG_TOKEN_FAKE",
            userId: new mongoose.Types.ObjectId(clientId),
        });

        // Link insight to account
        igInsight.instagramAccountId = igAccount._id;
        await igInsight.save();

        allIgAccounts.push(igAccount._id);
        console.log(`  ✅ Instagram: @${ig.username}`);
    }

    // ── 4. Ad Accounts ────────────────────────────────────────────────────────
    for (let i = 0; i < AD_ACCOUNTS.length; i++) {
        const ad = AD_ACCOUNTS[i];
        const fakeAdId = `act_${rand(100000000, 999999999)}`;

        const adInsight = await AdAccountInsights.create({
            name: ad.name,
            fbEntityId: fakeAdId,
            adsetname: `Demo Adset ${i + 1}`,
            adsetid: `adset_demo_${i + 1}`,
            metric: {
                impressions: rand(50000, 500000),
                clicks: rand(2000, 20000),
                spend: randFloat(5000, 80000),
                reach: rand(30000, 300000),
                cpm: randFloat(5, 30),
                cpc: randFloat(0.5, 8),
                ctr: randFloat(0.5, 5),
                conversions: rand(50, 500),
                roas: randFloat(1.5, 8),
                cost_per_conversion: randFloat(50, 500),
                frequency: randFloat(1.2, 3.5),
                unique_clicks: rand(1500, 15000),
                video_play_actions: rand(500, 10000),
                video_thruplay_watched_actions: rand(100, 3000),
            },
            history: buildAdHistory(),
        });

        const adAccount = await AdAccount.create({
            userId: new mongoose.Types.ObjectId(clientId),
            adAccountId: fakeAdId,
            name: ad.name,
            account_status: 1,
            currency: ad.currency,
            timezone_name: "Asia/Kolkata",
            accessToken: "DEMO_AD_TOKEN_FAKE",
        });

        adInsight.adAccountId = adAccount._id;
        await adInsight.save();

        allAdAccounts.push(adAccount._id);
        console.log(`  ✅ Ad Account: ${ad.name}`);
    }

    // ── 5. Google Ads Accounts ────────────────────────────────────────────────
    for (let i = 0; i < GOOGLE_ADS_ACCOUNTS.length; i++) {
        const ga = GOOGLE_ADS_ACCOUNTS[i];

        const gAdsAccount = await GoogleAdsAccount.create({
            accountId: ga.accountId,
            descriptiveName: ga.name,
            manager: false,
            level: "CLIENT",
            timeZone: "Asia/Kolkata",
            resourceName: `customers/${ga.customerId}`,
            customerId: ga.customerId,
            userEmail: "client@demo.com",
            isActive: true,
            lastSynced: new Date(),
            tokenType: "Bearer",
        });

        // Google Ads Insights (3 campaigns each)
        const campaigns = [
            { name: "Brand Awareness Campaign", id: `camp_${i}_1` },
            { name: "Lead Generation Campaign", id: `camp_${i}_2` },
            { name: "Retargeting Campaign", id: `camp_${i}_3` },
        ];

        for (const camp of campaigns) {
            await GoogleAdsInsight.create({
                googleAdsAccountId: gAdsAccount._id,
                campaignId: camp.id,
                customerId: ga.customerId,
                name: camp.name,
                dateRange: {
                    since: daysAgo(30).toISOString().split("T")[0],
                    until: new Date().toISOString().split("T")[0],
                },
                metric: {
                    impressions: rand(10000, 100000),
                    clicks: rand(500, 8000),
                    cost_micros: rand(5000000, 80000000),
                    conversions: rand(20, 300),
                    ctr: randFloat(1, 8),
                    average_cpc: rand(500000, 3000000),
                    conversion_rate: randFloat(1, 15),
                    cost_per_conversion: rand(1000000, 10000000),
                    roas: randFloat(2, 10),
                },
                history: buildGoogleAdsHistory(),
            });
        }

        allGoogleAdsAccounts.push(gAdsAccount._id);
        console.log(`  ✅ Google Ads: ${ga.name}`);
    }

    // ── 6. Google Search Console ──────────────────────────────────────────────
    for (const domain of SEO_DOMAINS) {
        const gsc = await GoogleSearchConsoleAccount.create({
            siteUrl: domain,
            permissionLevel: "siteFullUser",
            userEmail: "client@demo.com",
            isActive: true,
            lastSynced: new Date(),
            tokenType: "Bearer",
        });
        allGscAccounts.push(gsc._id);
        console.log(`  ✅ GSC: ${domain}`);
    }

    // ── 7. SEO Reports ────────────────────────────────────────────────────────
    const targetUserId = userId || clientId;
    const seoBulk = [];

    for (const domain of SEO_DOMAINS) {
        for (const query of SEO_QUERIES) {
            for (const page of SEO_PAGES.slice(0, 4)) { // 4 pages per query
                // Last 30 days (one record per day per query/page combo)
                for (const dateStr of last30Days().slice(0, 7)) { // 7 days per combo
                    const clicks = rand(0, 200);
                    const impressions = rand(clicks * 2, clicks * 20 + 100);
                    seoBulk.push({
                        userId: new mongoose.Types.ObjectId(targetUserId),
                        siteUrl: domain,
                        query,
                        page: `${domain}${page}`,
                        country: pick(["ind", "usa", "gbr", "aus", "can"]),
                        device: pick(["MOBILE", "DESKTOP", "TABLET"]),
                        clicks,
                        impressions,
                        ctr: impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0,
                        position: randFloat(1, 50),
                        date: new Date(dateStr),
                    });
                }
            }
        }
    }

    // Insert SEO in batches (avoid index conflicts with insertMany + ordered:false)
    try {
        await SeoReport.insertMany(seoBulk, { ordered: false });
        console.log(`  ✅ SEO Reports: ${seoBulk.length} records inserted`);
    } catch (e) {
        const inserted = e?.result?.nInserted || e?.insertedCount || "?";
        console.log(`  ⚠️  SEO Reports: ~${inserted} inserted (some duplicate skips)`);
    }

    // ── 8. Update Client User with all linked data ────────────────────────────
    await User.findByIdAndUpdate(clientId, {
        pages: allPages,
        instagramAccounts: allIgAccounts,
        adAccounts: allAdAccounts,
        googleAdsAccounts: allGoogleAdsAccounts,
        googleSearchConsoleAccounts: allGscAccounts,
        seoReports: allSeoReports,
        mainPage: allPages[0] || null,
        mainInstagram: allIgAccounts[0] || null,
        mainAd: allAdAccounts[0] || null,
        mainGoogleAd: allGoogleAdsAccounts[0] || null,
        mainSEOsites: allGscAccounts[0] || null,
    });
    console.log("✅ Client user fields updated");

    // ── 9. Update Demo User with same data (copy) ────────────────────────────
    if (userId) {
        await User.findByIdAndUpdate(userId, {
            pages: allPages,
            instagramAccounts: allIgAccounts,
            adAccounts: allAdAccounts,
            googleAdsAccounts: allGoogleAdsAccounts,
            googleSearchConsoleAccounts: allGscAccounts,
            mainPage: allPages[0] || null,
            mainInstagram: allIgAccounts[0] || null,
            mainAd: allAdAccounts[0] || null,
            mainGoogleAd: allGoogleAdsAccounts[0] || null,
            mainSEOsites: allGscAccounts[0] || null,
        });
        console.log("✅ Demo user fields updated");
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log("\n" + "═".repeat(60));
    console.log("🎉  FAKE DATA SEEDED SUCCESSFULLY!");
    console.log("═".repeat(60));
    console.log(`📄  Facebook Pages       : ${allPages.length} pages + posts + insights`);
    console.log(`📸  Instagram Accounts   : ${allIgAccounts.length} accounts + insights`);
    console.log(`📢  Ad Accounts          : ${allAdAccounts.length} accounts + insights`);
    console.log(`🔍  Google Ads Accounts  : ${allGoogleAdsAccounts.length} accounts + campaigns`);
    console.log(`🌐  Search Console Sites : ${allGscAccounts.length} sites`);
    console.log(`📊  SEO Reports          : ${seoBulk.length} records (30 days)`);
    console.log("═".repeat(60));
    console.log("Login as demo client → http://localhost:3000/en/client/login");
    console.log("Login as demo user   → http://localhost:3000/en/user/login");
    console.log("═".repeat(60) + "\n");

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Error:", err.message);
    console.error(err);
    process.exit(1);
});
