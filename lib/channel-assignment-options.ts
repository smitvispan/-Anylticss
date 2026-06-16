import FacebookUser from "@/models/FacebookUser";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";

type ChannelAssignmentOptions = {
  pages: Array<{ _id: unknown; name?: string | null }>;
  instas: Array<{ _id: unknown; username?: string | null }>;
  ads: Array<{ _id: unknown; name?: string | null }>;
  subAccounts: Array<{ _id: unknown; accountId?: string | null; descriptiveName?: string | null }>;
  gscSite: Array<{ _id: unknown; siteUrl?: string | null }>;
};

export async function getOwnerChannelAssignmentOptions({
  ownerId,
  ownerEmail,
}: {
  ownerId: string | null | undefined;
  ownerEmail?: string | null;
}): Promise<ChannelAssignmentOptions> {
  if (!ownerId) {
    return {
      pages: [],
      instas: [],
      ads: [],
      subAccounts: [],
      gscSite: [],
    };
  }

  const fbUsers = await FacebookUser.find({ adminId: ownerId }).select("_id").lean();
  const fbUserIds = fbUsers.map((user) => user._id);
  const googleQuery = ownerEmail
    ? { $or: [{ adminId: ownerId }, { userEmail: ownerEmail }] }
    : { adminId: ownerId };

  const [pagesRaw, instasRaw, adsRaw, subAccountsRaw, gscSiteRaw] = await Promise.all([
    fbUserIds.length
      ? Page.find({ userId: { $in: fbUserIds } }, { _id: 1, name: 1 }).sort({ name: 1 }).lean()
      : [],
    fbUserIds.length
      ? InstagramAccount.find({ userId: { $in: fbUserIds } }, { _id: 1, username: 1 }).sort({ username: 1 }).lean()
      : [],
    fbUserIds.length
      ? AdAccount.find({ userId: { $in: fbUserIds } }, { _id: 1, name: 1 }).sort({ name: 1 }).lean()
      : [],
    GoogleAdsAccount.find(googleQuery, { _id: 1, accountId: 1, descriptiveName: 1 })
      .sort({ descriptiveName: 1, accountId: 1 })
      .lean(),
    GoogleSearchConsoleAccount.find(googleQuery, { _id: 1, siteUrl: 1 })
      .sort({ siteUrl: 1 })
      .lean(),
  ]);

  return {
    pages: JSON.parse(JSON.stringify(pagesRaw)),
    instas: JSON.parse(JSON.stringify(instasRaw)),
    ads: JSON.parse(JSON.stringify(adsRaw)),
    subAccounts: JSON.parse(JSON.stringify(subAccountsRaw)),
    gscSite: JSON.parse(JSON.stringify(gscSiteRaw)),
  };
}
