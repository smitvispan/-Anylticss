import mongoose from "mongoose";
import User from "@/models/User";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import connectDB from "@/lib/mongodb";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Suspense } from "react";
import { Icon } from "@/components/ui/icon";
import UserToasts from "./_components/UserToasts";
import DeleteButton from "./_components/DeleteButton";
import { deleteClientUserAction } from "./actions";
import { formatPlanLimit, formatPlanSeatUsage, hasReachedPlanLimit } from "@/lib/plan-limits";
import { getPlanDisplayName } from "@/lib/plan-catalog";

type ChannelTone = "slate" | "sky" | "violet" | "amber" | "emerald" | "rose";

type ClientUserRow = {
  _id: string;
  name?: string | null;
  email?: string | null;
  password?: string | null;
  mainPage?: string | null;
  mainInstagram?: string | null;
  mainAd?: string | null;
  mainGoogleAd?: string | null;
  mainSEOsites?: string | null;
};

function toValidObjectIdString(value?: string | null) {
  if (!value) return null;
  const stringValue = String(value);
  return mongoose.Types.ObjectId.isValid(stringValue) ? stringValue : null;
}

function uniqueValidObjectIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => toValidObjectIdString(value)).filter(Boolean))
  ) as string[];
}

function trimLabel(label?: string | number | null, max = 24) {
  if (label === undefined || label === null) return "—";
  const value = typeof label === "string" ? label : String(label);
  const clean = value
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function badgeClasses(tone: ChannelTone, muted = false) {
  if (muted) {
    return "border-slate-200/80 bg-slate-50 text-slate-500";
  }

  const map: Record<ChannelTone, string> = {
    slate: "border-slate-200/80 bg-slate-50 text-slate-700",
    sky: "border-sky-200/80 bg-sky-50 text-sky-700",
    violet: "border-violet-200/80 bg-violet-50 text-violet-700",
    amber: "border-amber-200/80 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200/80 bg-rose-50 text-rose-700",
  };

  return map[tone];
}

function resolveChannelState(params: {
  refId?: string | null;
  label?: string | null;
  tone: ChannelTone;
}) {
  const { refId, label, tone } = params;

  if (!refId) {
    return {
      text: "Not linked",
      title: "No default channel linked yet",
      classes: badgeClasses(tone, true),
      linked: false,
    };
  }

  if (!label) {
    return {
      text: "Missing record",
      title: `Broken reference: ${refId}`,
      classes: badgeClasses("rose"),
      linked: false,
    };
  }

  return {
    text: trimLabel(label),
    title: label,
    classes: badgeClasses(tone),
    linked: true,
  };
}

function isSubscriptionActive(subscription?: {
  status?: string | null;
  endDate?: string | Date | null;
  planId?: unknown;
} | null) {
  if (!subscription?.planId || subscription.status !== "active" || !subscription.endDate) {
    return false;
  }

  const endDate = new Date(subscription.endDate);
  return !Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now();
}

export default async function ClientUsersPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getAnalyticsSession();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { role, id: sessionId } = session.user;
  const isOwner = role === "client" && sessionId === id;
  const isAdmin = role === "admin";

  if (!isOwner && !isAdmin) {
    redirect(`/${locale}/login`);
  }

  const _forceModels = [Subscription, Plan];

  await connectDB();

  const clientRaw = await User.findById(id)
    .select({ _id: 1, name: 1, email: 1, activeSubscription: 1 })
    .populate({
      path: "activeSubscription",
      populate: {
        path: "planId",
        select: { _id: 1, name: 1, maxUsers: 1, price: 1, validityMonths: 1 },
      },
    })
    .lean();

  if (!clientRaw) {
    redirect(`/${locale}`);
  }

  const usersRaw = await User.find({ parent_client_id: id, role: "user", isAdmin: false })
    .sort({ createdAt: -1 })
    .lean();

  const users = JSON.parse(JSON.stringify(usersRaw)) as ClientUserRow[];
  const pageIds = uniqueValidObjectIds(users.map((u) => u.mainPage));
  const instaIds = uniqueValidObjectIds(users.map((u) => u.mainInstagram));
  const adIds = uniqueValidObjectIds(users.map((u) => u.mainAd));
  const googleAdIds = uniqueValidObjectIds(users.map((u) => u.mainGoogleAd));
  const gscIds = uniqueValidObjectIds(users.map((u) => u.mainSEOsites));

  const [pages, instas, ads, googleAdsAccounts, gscAccounts] = await Promise.all([
    pageIds.length ? Page.find({ _id: { $in: pageIds } }).lean() : [],
    instaIds.length ? InstagramAccount.find({ _id: { $in: instaIds } }).lean() : [],
    adIds.length ? AdAccount.find({ _id: { $in: adIds } }).lean() : [],
    googleAdIds.length ? GoogleAdsAccount.find({ _id: { $in: googleAdIds } }).lean() : [],
    gscIds.length ? GoogleSearchConsoleAccount.find({ _id: { $in: gscIds } }).lean() : [],
  ]);

  const pageMap = new Map(pages.map((p) => [String(p._id), p.name || "(no name)"]));
  const instaMap = new Map(instas.map((i) => [String(i._id), i.username || "(no username)"]));
  const adMap = new Map(ads.map((a) => [String(a._id), a.name || "(no name)"]));
  const googleAdsMap = new Map(
    googleAdsAccounts.map((g) => [String(g._id), g.descriptiveName || g.accountId || "(no name)"])
  );
  const gscMap = new Map(
    gscAccounts.map((g) => [String(g._id), g.siteUrl || "(no site)"])
  );

  const clientSubscription = (clientRaw as any)?.activeSubscription || null;
  const currentPlan = clientSubscription?.planId || null;
  const currentPlanName = currentPlan ? getPlanDisplayName(currentPlan) : "No active plan";
  const seatLimit = currentPlan?.maxUsers;
  const seatLimitLabel = formatPlanLimit(seatLimit);
  const hasActivePlan = isSubscriptionActive(clientSubscription);
  const needsAttentionUsers = users.filter((u) => {
    const refs = [
      [u.mainPage, pageMap.get(String(u.mainPage))],
      [u.mainInstagram, instaMap.get(String(u.mainInstagram))],
      [u.mainAd, adMap.get(String(u.mainAd))],
      [u.mainGoogleAd, googleAdsMap.get(String(u.mainGoogleAd))],
      [u.mainSEOsites, gscMap.get(String(u.mainSEOsites))],
    ] as const;

    return !u.password || refs.some(([refId, label]) => Boolean(refId) && !label);
  }).length;
  const seatUsageLabel = hasActivePlan ? formatPlanSeatUsage(users.length, seatLimit) : "No active plan";

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
        <Suspense fallback={null}>
          <UserToasts />
        </Suspense>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Client · Users</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Users</h1>
            <p className="text-sm text-slate-600">
              Review user access, connected channels, and jump into dashboards quickly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/analytics/${id}/users/new`}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
            >
              <Icon icon="lucide:plus" className="h-4 w-4" />
              Create user
            </Link>
            <Link
              href={`/analytics/${id}/connections`}
              className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:inline-flex"
            >
              Connect channels
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Active users</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Seat usage</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{seatUsageLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current plan</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{currentPlanName}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Needs attention</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{needsAttentionUsers}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50 px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Roster</p>
              <p className="text-sm text-slate-600">Ownership, default channels, and quick actions.</p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {hasActivePlan ? `${seatUsageLabel} seats` : `${users.length} users`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">User</th>
                  <th className="py-3 px-4 text-left font-semibold">Main Page</th>
                  <th className="py-3 px-4 text-left font-semibold">Main Instagram</th>
                  <th className="py-3 px-4 text-left font-semibold">Main Ad</th>
                  <th className="py-3 px-4 text-left font-semibold">Google Ads</th>
                  <th className="py-3 px-4 text-left font-semibold">SEO Site</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                      No users yet. Start by creating a user profile.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const pageState = resolveChannelState({
                      refId: u.mainPage ? String(u.mainPage) : null,
                      label: pageMap.get(String(u.mainPage)) ?? null,
                      tone: "slate",
                    });
                    const instaState = resolveChannelState({
                      refId: u.mainInstagram ? String(u.mainInstagram) : null,
                      label: instaMap.get(String(u.mainInstagram)) ?? null,
                      tone: "violet",
                    });
                    const adState = resolveChannelState({
                      refId: u.mainAd ? String(u.mainAd) : null,
                      label: adMap.get(String(u.mainAd)) ?? null,
                      tone: "sky",
                    });
                    const googleAdsState = resolveChannelState({
                      refId: u.mainGoogleAd ? String(u.mainGoogleAd) : null,
                      label: googleAdsMap.get(String(u.mainGoogleAd)) ?? null,
                      tone: "amber",
                    });
                    const gscState = resolveChannelState({
                      refId: u.mainSEOsites ? String(u.mainSEOsites) : null,
                      label: gscMap.get(String(u.mainSEOsites)) ?? null,
                      tone: "emerald",
                    });

                    return (
                      <tr
                        key={u._id}
                        className="border-b border-slate-100/80 bg-white transition hover:bg-sky-50/60 last:border-0"
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 line-clamp-1">{u.name || "—"}</span>
                            <span className="text-xs text-slate-500 line-clamp-1">{u.email || "No email"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/${locale}/analytics/${u._id}/page?t=${Date.now()}`}
                            title={pageState.title}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className={`inline-flex max-w-[180px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold truncate ${pageState.classes}`}>
                              {pageState.text}
                            </span>
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/${locale}/analytics/${u._id}/instagram?t=${Date.now()}`}
                            title={instaState.title}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className={`inline-flex max-w-[180px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold truncate ${instaState.classes}`}>
                              {instaState.text}
                            </span>
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/${locale}/analytics/${u._id}/metaads?t=${Date.now()}`}
                            title={adState.title}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className={`inline-flex max-w-[180px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold truncate ${adState.classes}`}>
                              {adState.text}
                            </span>
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/${locale}/analytics/${u._id}/googleads?t=${Date.now()}`}
                            title={googleAdsState.title}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className={`inline-flex max-w-[180px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold truncate ${googleAdsState.classes}`}>
                              {googleAdsState.text}
                            </span>
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/${locale}/analytics/${u._id}/seo?t=${Date.now()}`}
                            title={gscState.title}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className={`inline-flex max-w-[180px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold truncate ${gscState.classes}`}>
                              {gscState.text}
                            </span>
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/analytics/${id}/users/${u._id}/edit`}
                              className="inline-flex items-center rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50"
                            >
                              Edit
                            </Link>
                            <form action={deleteClientUserAction}>
                              <input type="hidden" name="userId" value={String(u._id)} />
                              <input type="hidden" name="clientId" value={id} />
                              <DeleteButton />
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!hasActivePlan && (
          <div className="rounded-3xl border border-amber-200 bg-white/90 px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">No active subscription plan found.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Team seat usage and limits proper rite manage karva active plan required chhe.
                </p>
              </div>
              <Link
                href={`/analytics/${id}/plans`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Subscription Plans
              </Link>
            </div>
          </div>
        )}

        {hasActivePlan && hasReachedPlanLimit(users.length, seatLimit) && (
          <div className="rounded-3xl border border-amber-200 bg-white/90 px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">User seat limit reached.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Current plan
                  {" "}
                  <span className="font-semibold text-slate-900">{currentPlanName}</span>
                  {" "}
                  max {seatLimitLabel} team user allow kare chhe.
                </p>
              </div>
              <Link
                href={`/analytics/${id}/plans`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
