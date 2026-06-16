/**
 * Demo Accounts Seed Script
 * Run: node scripts/seed-demo-accounts.js
 *
 * Creates:
 *  - Admin  : admin@demo.com  / Demo@123
 *  - Client : client@demo.com / Demo@123  (Plan 1)
 *  - User   : test@demo.com   / Demo@123  (linked to demo client)
 */

require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_FALLBACK ||
    "mongodb://localhost:27017/analytics";

// ─── Schemas ────────────────────────────────────────────────────────────────

const AdminSchema = new mongoose.Schema(
    {
        email: { type: String, unique: true, lowercase: true, trim: true },
        password: String,
        role: { type: String, default: "admin", enum: ["admin", "superadmin"] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const PlanSchema = new mongoose.Schema(
    {
        name: String,
        price: Number,
        description: String,
        maxUsers: { type: Number, default: 0 },
        maxFacebookPages: { type: Number, default: 0 },
        maxInstagramAccounts: { type: Number, default: 0 },
        maxAdAccounts: { type: Number, default: 0 },
        maxGoogleAdsAccounts: { type: Number, default: 0 },
        maxSeoReports: { type: Number, default: 0 },
        canResell: { type: Boolean, default: false },
        maxSubClients: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const SubscriptionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
        status: { type: String, default: "active" },
        startDate: { type: Date, default: Date.now },
        endDate: Date,
        paymentId: String,
    },
    { timestamps: true }
);

const UserSchema = new mongoose.Schema(
    {
        name: String,
        role: { type: String, enum: ["client", "user"], default: "client" },
        parent_client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        email: { type: String, unique: true },
        password: String,
        image: { type: String, default: null },
        isAdmin: { type: Boolean, default: false },
        activeSubscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
        client_id: { type: String, default: null },
        contact_id: { type: String, default: null },
        ERP_token: { type: String, default: null },
        pages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Page" }],
        adAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "AdAccount" }],
        instagramAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "InstagramAccount" }],
        googleSearchConsoleAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "GoogleSearchConsoleAccount" }],
        googleAdsAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "GoogleAdsAccount" }],
        campaigns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Campaign" }],
        seoReports: [{ type: mongoose.Schema.Types.ObjectId, ref: "SeoReport" }],
        accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Account" }],
        sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],
        mainPage: { type: mongoose.Schema.Types.ObjectId, ref: "Page", default: null },
        mainInstagram: { type: mongoose.Schema.Types.ObjectId, ref: "InstagramAccount", default: null },
        mainAd: { type: mongoose.Schema.Types.ObjectId, ref: "AdAccount", default: null },
        mainGoogleAd: { type: mongoose.Schema.Types.ObjectId, ref: "AdAccount", default: null },
        mainSEOsites: { type: mongoose.Schema.Types.ObjectId, ref: "GscSite", default: null },
    },
    { timestamps: true }
);

// ─── Models ─────────────────────────────────────────────────────────────────
const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
const Plan = mongoose.models.Plan || mongoose.model("Plan", PlanSchema);
const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", SubscriptionSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    const password = await bcrypt.hash("Demo@123", 10);

    // ── 1. Admin ──────────────────────────────────────────────────────────────
    const adminEmail = "admin@demo.com";
    let adminDoc = await Admin.findOne({ email: adminEmail });
    if (!adminDoc) {
        adminDoc = await Admin.create({
            email: adminEmail,
            password,
            role: "admin",
            isActive: true,
        });
        console.log("✅ Admin created:", adminEmail);
    } else {
        await Admin.findByIdAndUpdate(adminDoc._id, { password, role: "admin", isActive: true });
        console.log("🔄 Admin updated:", adminEmail);
    }

    // ── 2. Demo Plan (Plan 1) ─────────────────────────────────────────────────
    const planName = "Plan 1";
    let plan = await Plan.findOne({ name: planName });
    if (!plan) {
        plan = await Plan.create({
            name: planName,
            price: 100,
            description: "1 SEO report slot for one agency with unlimited user creation.",
            maxUsers: -1,
            maxFacebookPages: 1,
            maxInstagramAccounts: 1,
            maxAdAccounts: 1,
            maxGoogleAdsAccounts: 1,
            maxSeoReports: 1,
            canResell: false,
            maxSubClients: 0,
            validityMonths: 12,
        });
        console.log("✅ Plan created:", planName);
    } else {
        await Plan.findByIdAndUpdate(plan._id, {
            price: 100,
            description: "1 SEO report slot for one agency with unlimited user creation.",
            maxUsers: -1,
            maxFacebookPages: 1,
            maxInstagramAccounts: 1,
            maxAdAccounts: 1,
            maxGoogleAdsAccounts: 1,
            maxSeoReports: 1,
            canResell: false,
            maxSubClients: 0,
            validityMonths: 12,
        });
        plan = await Plan.findById(plan._id);
        console.log("🔄 Plan updated:", planName);
    }

    // ── 3. Client ─────────────────────────────────────────────────────────────
    const clientEmail = "client@demo.com";
    let clientUser = await User.findOne({ email: clientEmail });

    if (!clientUser) {
        clientUser = await User.create({
            name: "Demo Client",
            email: clientEmail,
            password,
            role: "client",
            isAdmin: false,
        });
        console.log("✅ Client created:", clientEmail);
    } else {
        await User.findByIdAndUpdate(clientUser._id, {
            password,
            name: "Demo Client",
            role: "client",
            isAdmin: false,
        });
        clientUser = await User.findOne({ email: clientEmail });
        console.log("🔄 Client updated:", clientEmail);
    }

    // Create/update subscription for client
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 10); // 10 years for demo

    let subscription = await Subscription.findOne({ userId: clientUser._id });
    if (!subscription) {
        subscription = await Subscription.create({
            userId: clientUser._id,
            planId: plan._id,
            status: "active",
            startDate: new Date(),
            endDate: oneYearLater,
            paymentId: "DEMO_PAYMENT",
        });
        console.log("✅ Subscription created for client");
    } else {
        await Subscription.findByIdAndUpdate(subscription._id, {
            planId: plan._id,
            status: "active",
            endDate: oneYearLater,
        });
        console.log("🔄 Subscription updated for client");
    }

    // Link subscription to client
    await User.findByIdAndUpdate(clientUser._id, {
        activeSubscription: subscription._id,
    });

    // ── 4. User ───────────────────────────────────────────────────────────────
    const userEmail = "test@demo.com";
    let userDoc = await User.findOne({ email: userEmail });

    if (!userDoc) {
        userDoc = await User.create({
            name: "Demo User",
            email: userEmail,
            password,
            role: "user",
            isAdmin: false,
            parent_client_id: clientUser._id,
        });
        console.log("✅ User created:", userEmail);
    } else {
        await User.findByIdAndUpdate(userDoc._id, {
            password,
            name: "Demo User",
            role: "user",
            isAdmin: false,
            parent_client_id: clientUser._id,
        });
        console.log("🔄 User updated:", userEmail);
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log("\n" + "═".repeat(55));
    console.log("🎉  DEMO ACCOUNTS READY!");
    console.log("═".repeat(55));
    console.log("🔐  Admin  Login  → http://localhost:3000/en/admin/login");
    console.log("    Email    : admin@demo.com");
    console.log("    Password : Demo@123");
    console.log("");
    console.log("🔐  Client Login  → http://localhost:3000/en/client/login");
    console.log("    Email    : client@demo.com");
    console.log("    Password : Demo@123");
    console.log("    Plan     : Plan 1");
    console.log("");
    console.log("🔐  User   Login  → http://localhost:3000/en/user/login");
    console.log("    Email    : test@demo.com");
    console.log("    Password : Demo@123");
    console.log("    Parent   : Demo Client");
    console.log("");
    console.log("ℹ️   Demo reports/pages/accounts seed karva mate:");
    console.log("    npm run seed:demo:all");
    console.log("═".repeat(55) + "\n");

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
