import connectDB from "@/lib/mongodb";
import { getOwnerChannelAssignmentOptions } from "@/lib/channel-assignment-options";
import User from "@/models/User";
import FacebookUser from "@/models/FacebookUser";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";

function normalizeIds(values: unknown) {
  const source = Array.isArray(values) ? values : values ? [values] : [];
  return Array.from(
    new Set(
      source
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

async function loadViewer(userId: string) {
  await connectDB();
  return User.findById(userId)
    .select({
      _id: 1,
      email: 1,
      role: 1,
      pages: 1,
      instagramAccounts: 1,
      adAccounts: 1,
      googleAdsAccounts: 1,
      mainPage: 1,
      mainInstagram: 1,
      mainAd: 1,
      mainGoogleAd: 1,
    })
    .lean();
}

function resolvePreferredOption<T extends { _id: unknown }>(options: T[], requestedId?: string | null, fallbackId?: unknown) {
  const requested = requestedId ? String(requestedId) : "";
  const fallback = fallbackId ? String(fallbackId) : "";

  if (requested) {
    const match = options.find((entry) => String(entry._id) === requested);
    if (match) return match;
  }

  if (fallback) {
    const match = options.find((entry) => String(entry._id) === fallback);
    if (match) return match;
  }

  return options[0] || null;
}

function resolvePreferredSource<T extends { _id: unknown }>(sources: T[], requestedSourceId?: string | null) {
  const requested = requestedSourceId ? String(requestedSourceId) : "";

  if (requested) {
    const match = sources.find((entry) => String(entry._id) === requested);
    if (match) return match;
  }

  return sources[0] || null;
}

async function loadMetaSourceOptions(user: any) {
  if (!user || user.role === "user") return [];

  return FacebookUser.find({ adminId: String(user._id) })
    .select({ _id: 1, name: 1, email: 1, facebookId: 1 })
    .sort({ createdAt: 1, name: 1 })
    .lean();
}

export async function resolvePageOptionsForUser(userId: string, requestedPageId?: string | null, requestedSourceId?: string | null) {
  const user = await loadViewer(userId);
  if (!user) return { user: null, selected: null, options: [] as any[], sourceOptions: [] as any[], selectedSource: null };

  let candidateIds =
    user.role === "user" ? normalizeIds(user.mainPage) : normalizeIds(user.pages);
  if (!candidateIds.length && user.role !== "user") candidateIds = normalizeIds(user.mainPage);
  const sourceOptions = await loadMetaSourceOptions(user);
  const selectedSource = sourceOptions.length > 1 ? resolvePreferredSource(sourceOptions, requestedSourceId) : null;
  const sourceFilter = selectedSource ? { userId: selectedSource._id } : {};

  let options = candidateIds.length
    ? await Page.find({ _id: { $in: candidateIds }, ...sourceFilter })
        .select({ _id: 1, name: 1, link: 1, category: 1, picture: 1 })
        .sort({ name: 1 })
        .lean()
    : [];

  if (!options.length && user.role !== "user") {
    const ownerOptions = await getOwnerChannelAssignmentOptions({
      ownerId: String(user._id),
      ownerEmail: user.email || null,
    });
    candidateIds = normalizeIds(ownerOptions.pages.map((entry) => entry._id));
    options = candidateIds.length
      ? await Page.find({ _id: { $in: candidateIds }, ...sourceFilter })
          .select({ _id: 1, name: 1, link: 1, category: 1, picture: 1 })
          .sort({ name: 1 })
          .lean()
      : [];
  }

  return {
    user,
    selected: resolvePreferredOption(options, requestedPageId, user.mainPage),
    options,
    sourceOptions,
    selectedSource,
  };
}

export async function resolveInstagramOptionsForUser(userId: string, requestedInstagramId?: string | null, requestedSourceId?: string | null) {
  const user = await loadViewer(userId);
  if (!user) return { user: null, selected: null, options: [] as any[], sourceOptions: [] as any[], selectedSource: null };

  let candidateIds =
    user.role === "user" ? normalizeIds(user.mainInstagram) : normalizeIds(user.instagramAccounts);
  if (!candidateIds.length && user.role !== "user") candidateIds = normalizeIds(user.mainInstagram);
  const sourceOptions = await loadMetaSourceOptions(user);
  const selectedSource = sourceOptions.length > 1 ? resolvePreferredSource(sourceOptions, requestedSourceId) : null;
  const sourceFilter = selectedSource ? { userId: selectedSource._id } : {};

  let options = candidateIds.length
    ? await InstagramAccount.find({ _id: { $in: candidateIds }, ...sourceFilter })
        .sort({ username: 1, name: 1 })
        .lean()
    : [];

  if (!options.length && user.role !== "user") {
    const ownerOptions = await getOwnerChannelAssignmentOptions({
      ownerId: String(user._id),
      ownerEmail: user.email || null,
    });
    candidateIds = normalizeIds(ownerOptions.instas.map((entry) => entry._id));
    options = candidateIds.length
      ? await InstagramAccount.find({ _id: { $in: candidateIds }, ...sourceFilter })
          .sort({ username: 1, name: 1 })
          .lean()
      : [];
  }

  return {
    user,
    selected: resolvePreferredOption(options, requestedInstagramId, user.mainInstagram),
    options,
    sourceOptions,
    selectedSource,
  };
}

export async function resolveMetaAdOptionsForUser(userId: string, requestedAdAccountId?: string | null, requestedSourceId?: string | null) {
  const user = await loadViewer(userId);
  if (!user) return { user: null, selected: null, options: [] as any[], sourceOptions: [] as any[], selectedSource: null };

  let candidateIds =
    user.role === "user" ? normalizeIds(user.mainAd) : normalizeIds(user.adAccounts);
  if (!candidateIds.length && user.role !== "user") candidateIds = normalizeIds(user.mainAd);
  const sourceOptions = await loadMetaSourceOptions(user);
  const selectedSource = sourceOptions.length > 1 ? resolvePreferredSource(sourceOptions, requestedSourceId) : null;
  const sourceFilter = selectedSource ? { userId: selectedSource._id } : {};

  let options = candidateIds.length
    ? await AdAccount.find({ _id: { $in: candidateIds }, ...sourceFilter }).sort({ name: 1 }).lean()
    : [];

  if (!options.length && user.role !== "user") {
    const ownerOptions = await getOwnerChannelAssignmentOptions({
      ownerId: String(user._id),
      ownerEmail: user.email || null,
    });
    candidateIds = normalizeIds(ownerOptions.ads.map((entry) => entry._id));
    options = candidateIds.length
      ? await AdAccount.find({ _id: { $in: candidateIds }, ...sourceFilter }).sort({ name: 1 }).lean()
      : [];
  }

  return {
    user,
    selected: resolvePreferredOption(options, requestedAdAccountId, user.mainAd),
    options,
    sourceOptions,
    selectedSource,
  };
}

export async function resolveGoogleAdsOptionsForUser(userId: string, requestedGoogleAdsAccountId?: string | null) {
  const user = await loadViewer(userId);
  if (!user) return { user: null, selected: null, options: [] as any[] };

  let candidateIds =
    user.role === "user" ? normalizeIds(user.mainGoogleAd) : normalizeIds(user.googleAdsAccounts);
  if (!candidateIds.length && user.role !== "user") candidateIds = normalizeIds(user.mainGoogleAd);

  let options = candidateIds.length
    ? await GoogleAdsAccount.find({ _id: { $in: candidateIds } })
        .sort({ descriptiveName: 1, accountId: 1 })
        .lean()
    : [];

  if (!options.length && user.role !== "user") {
    const ownerOptions = await getOwnerChannelAssignmentOptions({
      ownerId: String(user._id),
      ownerEmail: user.email || null,
    });
    candidateIds = normalizeIds(ownerOptions.subAccounts.map((entry) => entry._id));
    options = candidateIds.length
      ? await GoogleAdsAccount.find({ _id: { $in: candidateIds } })
          .sort({ descriptiveName: 1, accountId: 1 })
          .lean()
      : [];
  }

  return {
    user,
    selected: resolvePreferredOption(options, requestedGoogleAdsAccountId, user.mainGoogleAd),
    options,
  };
}
