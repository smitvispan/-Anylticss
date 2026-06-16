import User from "@/models/User";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import FacebookUser from "@/models/FacebookUser";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import { formatPlanLimit, hasReachedPlanLimit } from "@/lib/plan-limits";

export type LimitType = 'users' | 'facebookPages' | 'instagramAccounts' | 'adAccounts' | 'googleAdsAccounts' | 'seoReports' | 'subClients';

export async function checkSubscriptionLimit(userId: string, type: LimitType) {
    const user = await User.findById(userId)
        .populate({
            path: 'activeSubscription',
            populate: { path: 'planId' }
        });

    if (!user) {
        throw new Error("User not found.");
    }

    // Admin has no limits
    if (user.isAdmin) return true;

    if (!user.activeSubscription) {
        throw new Error("No active subscription found for this client. Please contact admin.");
    }

    const subscription = user.activeSubscription as any;
    const plan = subscription.planId;

    if (subscription.status !== 'active') {
        throw new Error("Your subscription is not active. Please renew.");
    }

    if (new Date() > new Date(subscription.endDate)) {
        throw new Error("Your subscription has expired. Please upgrade or renew.");
    }

    switch (type) {
        case 'users': {
            const count = await User.countDocuments({ parent_client_id: userId });
            if (hasReachedPlanLimit(count, plan.maxUsers)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxUsers)} users.`);
            }
            break;
        }
        case 'subClients': {
            if (!plan.canResell) {
                throw new Error("Your plan does not allow reselling/sub-clients.");
            }
            const count = await User.countDocuments({ parent_client_id: userId, role: 'client' });
            if (hasReachedPlanLimit(count, plan.maxSubClients)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxSubClients)} sub-clients.`);
            }
            break;
        }
        case 'facebookPages': {
            const fbUsers = await FacebookUser.find({ adminId: userId }).select('_id');
            const fbUserIds = fbUsers.map(u => u._id);
            const count = await Page.countDocuments({ userId: { $in: fbUserIds } });
            if (hasReachedPlanLimit(count, plan.maxFacebookPages)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxFacebookPages)} Facebook pages.`);
            }
            break;
        }
        case 'instagramAccounts': {
            const fbUsers = await FacebookUser.find({ adminId: userId }).select('_id');
            const fbUserIds = fbUsers.map(u => u._id);
            const count = await InstagramAccount.countDocuments({ userId: { $in: fbUserIds } });
            if (hasReachedPlanLimit(count, plan.maxInstagramAccounts)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxInstagramAccounts)} Instagram accounts.`);
            }
            break;
        }
        case 'adAccounts': {
            const fbUsers = await FacebookUser.find({ adminId: userId }).select('_id');
            const fbUserIds = fbUsers.map(u => u._id);
            const count = await AdAccount.countDocuments({ userId: { $in: fbUserIds } });
            if (hasReachedPlanLimit(count, plan.maxAdAccounts)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxAdAccounts)} Ad accounts.`);
            }
            break;
        }
        case 'googleAdsAccounts': {
            const count = await GoogleAdsAccount.countDocuments({ userEmail: user.email });
            if (hasReachedPlanLimit(count, plan.maxGoogleAdsAccounts)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxGoogleAdsAccounts)} Google Ads accounts.`);
            }
            break;
        }
        case 'seoReports': {
            const count = await GoogleSearchConsoleAccount.countDocuments({ userEmail: user.email });
            if (hasReachedPlanLimit(count, plan.maxSeoReports)) {
                throw new Error(`Limit reached: Your plan allows maximum ${formatPlanLimit(plan.maxSeoReports)} SEO reports/properties.`);
            }
            break;
        }
        default:
            break;
    }

    return true;
}
