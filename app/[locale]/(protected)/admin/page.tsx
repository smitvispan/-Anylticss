import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import { Link } from "@/i18n/routing";

type Params = Promise<{ locale: string }>;

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
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

export default async function AdminUsersPage({ params }: { params: Params }) {
  const { locale } = await params;

  await connectDB();

  // 1️⃣ Fetch users
  const users = await User.find({ isAdmin: false })
    .sort({ createdAt: -1 })
    .lean();

  // 2️⃣ Collect IDs for mapping
  const pageIds = users.map((u) => u.mainPage).filter(Boolean);
  const instaIds = users.map((u) => u.mainInstagram).filter(Boolean);
  const adIds = users.map((u) => u.mainAd).filter(Boolean);
  const googleAdIds = users.map((u) => u.mainGoogleAd).filter(Boolean);
  const gscIds = users.map((u) => u.mainSEOsites).filter(Boolean);

  // 3️⃣ Fetch related collections
  const [pages, instas, ads, googleAdsAccounts, gscAccounts] = await Promise.all([
    pageIds.length ? Page.find({ _id: { $in: pageIds } }).lean() : [],
    instaIds.length ? InstagramAccount.find({ _id: { $in: instaIds } }).lean() : [],
    adIds.length ? AdAccount.find({ _id: { $in: adIds } }).lean() : [],
    googleAdIds.length ? GoogleAdsAccount.find({ _id: { $in: googleAdIds } }).lean() : [],
    gscIds.length
      ? GoogleSearchConsoleAccount.find({ _id: { $in: gscIds } }).lean()
      : [],
  ]);

  // 4️⃣ Build lookup maps
  const pageMap = new Map(pages.map((p) => [String(p._id), p.name || "(no name)"]));
  const instaMap = new Map(instas.map((i) => [String(i._id), i.username || "(no username)"]));
  const adMap = new Map(ads.map((a) => [String(a._id), a.name || "(no name)"]));
  const googleAdsMap = new Map(
    googleAdsAccounts.map((g) => [String(g._id), g.descriptiveName || g.accountId || "(no name)"])
  );
  const gscMap = new Map(
    gscAccounts.map((g) => [String(g._id), g.siteUrl || "(no site)"])
  );

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 lg:px-6 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · People</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Users & ownership</h1>
            <p className="text-sm text-slate-600">
              Review who owns which channels and hop into their analytics quickly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* <Link
              href="/admin/users/new"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            >
              <span className="text-base leading-none">+</span>
              New user
            </Link> */}
            <Link
              href="https://erp.vispansolutions.com/admin"
              className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:inline-flex"
            >
              Invite teammate
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Active users</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Pages referenced</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{pageMap.size || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Meta channels</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{instaMap.size + adMap.size}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Google channels</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{googleAdsMap.size + gscMap.size}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50 px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Roster</p>
              <p className="text-sm text-slate-600">Ownership, default channels, and quick actions.</p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {users.length} seats
            </span>
          </div>

          <div className="overflow-hidden">
            <table className="w-full table-fixed text-sm">
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
                      No users yet. Start by creating a new teammate.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const pageLabel = pageMap.get(String(u.mainPage)) ?? shortId(u.mainPage);
                    const instaLabel = instaMap.get(String(u.mainInstagram)) ?? shortId(u.mainInstagram);
                    const adLabel = adMap.get(String(u.mainAd)) ?? shortId(u.mainAd);
                    const googleAdsLabel =
                      googleAdsMap.get(String(u.mainGoogleAd)) ?? shortId(u.mainGoogleAd);
                    const gscLabel = gscMap.get(String(u.mainSEOsites)) ?? shortId(u.mainSEOsites);

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
                      <Link href={`../api/login/callback?_id=${u._id}&ERP_token=${u.ERP_token}&locale=en`} >
                        <span className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 truncate">
                          {trimLabel(pageLabel)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/analytics/${u._id}/instagram`} >
                        <span className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 truncate">
                          {trimLabel(instaLabel)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/analytics/${u._id}/metaads`} >
                        <span className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 truncate">
                          {trimLabel(adLabel)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/analytics/${u._id}/googleads`} >
                        <span className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 truncate">
                          {trimLabel(googleAdsLabel)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/analytics/${u._id}/seo`} >
                        <span className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 truncate">
                          {trimLabel(gscLabel)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                            href={`/admin/users/${u._id}/edit`}
                            className="inline-flex items-center rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
