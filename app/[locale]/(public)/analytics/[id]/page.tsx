import { redirect } from "next/navigation";
import { resolveClientIdentifiers } from "@/lib/client-identifiers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";

function isValidObjectId(str: string) {
  return /^[a-fA-F0-9]{24}$/.test(str);
}

async function hasRecord(
  model: any,
  preferredId: string | null | undefined,
  fallbackQuery: Record<string, unknown>,
  allowFallback: boolean
) {
  if (preferredId) {
    const byId = await model.exists({ _id: preferredId });
    if (byId) return true;
  }

  if (!allowFallback) {
    return false;
  }

  const byFallback = await model.exists(fallbackQuery);
  return Boolean(byFallback);
}

export default async function AnalyticsUserIndex({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const analyticsHome = `/${locale}/analytics`;

  if (!isValidObjectId(id)) {
    redirect(analyticsHome);
  }

  await connectDB();
  const user = await User.findById(id)
    .select({
      _id: 1,
      email: 1,
      role: 1,
      client_id: 1,
      contact_id: 1,
      ERP_token: 1,
      mainPage: 1,
      mainInstagram: 1,
      mainAd: 1,
      mainGoogleAd: 1,
      mainSEOsites: 1,
    })
    .lean();

  if (!user) {
    redirect(analyticsHome);
  }
  const allowFallbackRecords = user.role !== "user";

  const identifiers = await resolveClientIdentifiers({
    clientId: user.client_id,
    contactId: user.contact_id,
    isAdmin: false,
  });
  if (
    identifiers.client_id !== (user.client_id ?? null) ||
    identifiers.contact_id !== (user.contact_id ?? null) ||
    user.ERP_token
  ) {
    await User.findByIdAndUpdate(id, identifiers).catch(() => null);
  }

  const [hasPage, hasInstagram, hasMetaAds, hasGoogleAds, hasSeo] = await Promise.all([
    hasRecord(Page, user.mainPage ? String(user.mainPage) : null, { userId: id }, allowFallbackRecords),
    hasRecord(InstagramAccount, user.mainInstagram ? String(user.mainInstagram) : null, { userId: id }, allowFallbackRecords),
    hasRecord(AdAccount, user.mainAd ? String(user.mainAd) : null, { userId: id }, allowFallbackRecords),
    hasRecord(
      GoogleAdsAccount,
      user.mainGoogleAd ? String(user.mainGoogleAd) : null,
      user.email ? { userEmail: user.email } : { _id: null },
      allowFallbackRecords
    ),
    hasRecord(
      GoogleSearchConsoleAccount,
      user.mainSEOsites ? String(user.mainSEOsites) : null,
      user.email ? { userEmail: user.email } : { _id: null },
      allowFallbackRecords
    ),
  ]);

  if (hasPage) {
    redirect(`/${locale}/analytics/${id}/page`);
  }

  if (hasInstagram) {
    redirect(`/${locale}/analytics/${id}/instagram`);
  }

  if (hasMetaAds) {
    redirect(`/${locale}/analytics/${id}/metaads`);
  }

  if (hasGoogleAds) {
    redirect(`/${locale}/analytics/${id}/googleads`);
  }

  if (hasSeo) {
    redirect(`/${locale}/analytics/${id}/seo`);
  }

  redirect(`/${locale}/analytics/${id}/page`);
}
