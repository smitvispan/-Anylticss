import { notFound } from "next/navigation";
import GoogleData from "./_components/GoogleData";
import {
  resolveGoogleAdsAccountForUser,
  loadCampaignsFromDb,
  syncGoogleCampaignsForAccount,
  serializeCampaignDoc,
} from "@/lib/syncGoogleAds";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidObjectId(str: string) {
  return /^[a-fA-F0-9]{24}$/.test(str);
}

function normalizeCustomerId(raw?: string | null) {
  if (!raw) return "";
  return String(raw).replace(/^customers\//i, "").replace(/[^\d-]/g, "");
}

export default async function AnalyticsPublicDetail({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const { user, account } = await resolveGoogleAdsAccountForUser(id);
  if (!user) notFound();

  if (!account) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-lg font-semibold">No Google Ads account linked.</p>
        <p className="text-sm text-muted-foreground">
          Link a Google Ads account in the admin panel to view campaigns for this user.
        </p>
      </div>
    );
  }

  const customerId = normalizeCustomerId(account.accountId || account.customerId);
  const subAccountId = account._id ? String(account._id) : undefined;

  if (!customerId) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-lg font-semibold">Google Ads customer ID missing.</p>
        <p className="text-sm text-muted-foreground">
          Add a valid customer/account ID to this Google Ads connection to load campaigns.
        </p>
      </div>
    );
  }

  let campaigns = await loadCampaignsFromDb({
    customerId,
    subAccountId,
  });

  let syncedFromApi = false;

  if (!campaigns.length) {
    try {
      const syncResult = await syncGoogleCampaignsForAccount({
        googleAdsAccountId: subAccountId!,
        customerId,
        userId: String(user._id),
      });

      campaigns = syncResult.campaigns;
      syncedFromApi = true;
    } catch (e) {
      console.error("[GoogleAds] Sync failed:", e);
    }
  }

  const safeCampaigns = campaigns.map(serializeCampaignDoc);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Google Ads Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Performance insights for campaigns synced from your Google Ads account
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-primary/20 bg-primary/5 text-primary px-3 py-1">
              <Sparkles className="mr-2 h-3 w-3" />
              Synced Campaigns
            </Badge>
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {syncedFromApi ? "Refreshed just now" : "Loaded from cache"}
              </span>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-6">
            <GoogleData
              initialCampaigns={safeCampaigns}
              customerId={customerId}
              subAccountName={account.descriptiveName || account.accountId}
              subAccountId={subAccountId}
            />
            {syncedFromApi && (
              <p className="pt-4 text-sm text-gray-500 dark:text-gray-400">
                Campaigns were refreshed from Google Ads because none were stored.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
