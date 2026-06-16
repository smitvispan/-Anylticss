// app/(protected)/admin/users/[id]/edit/page.tsx
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import { notFound } from "next/navigation";
import { updateUserAction, deleteUserAction } from "../../actions";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import { Link } from "@/i18n/routing";

type Params = Promise<{ id: string; locale: string }>;

export default async function EditUserPage({ params }: { params: Params }) {
  const { id } = await params;

  await connectDB();

  const user = await User.findById(id, {
    name: 1,
    email: 1,
    image: 1,
    isAdmin: 1,
    mainPage: 1,
    mainInstagram: 1,
    mainAd: 1,
    mainGoogleAd: 1,
    mainSEOsites: 1,
    createdAt: 1,
    updatedAt: 1,
  }).lean();
  if (!user) notFound();

  const [pages, instas, ads, subAccounts, gscSite] = await Promise.all([
    Page.find({}, { _id: 1, name: 1 }).lean(),
    InstagramAccount.find({}, { _id: 1, username: 1 }).lean(),
    AdAccount.find({}, { _id: 1, name: 1 }).lean(),
    GoogleAdsAccount.find({}, { _id: 1, accountId: 1, descriptiveName: 1 }).lean(),
    GoogleSearchConsoleAccount.find({}, { _id: 1, siteUrl: 1 }).lean(),
  ]);

  const inputClass =
    "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-6 lg:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Admin · People</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Edit user</h1>
            <p className="mt-1 text-sm text-slate-600">
              Update details, rotate credentials, and adjust the channels this user owns.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
          >
            ← Back to Users
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{pages.length}</p>
            <p className="mt-1 text-slate-500">Pages available</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{instas.length}</p>
            <p className="mt-1 text-slate-500">Instagram profiles</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{ads.length}</p>
            <p className="mt-1 text-slate-500">Ad accounts</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="font-semibold text-slate-900">{subAccounts.length + gscSite.length}</p>
            <p className="mt-1 text-slate-500">Search & Google Ads</p>
          </div>
        </div>

        <form
          action={updateUserAction}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur"
        >
          <input type="hidden" name="id" value={user._id?.toString() ?? ""} />

          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Profile</p>
                <p className="mt-1 text-base text-slate-700">
                  Keep identity info and credentials up to date.
                </p>
              </div>
              <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Last updated {new Date(user.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className={labelClass}>Full name</label>
                <input
                  id="name"
                  name="name"
                  className={inputClass}
                  defaultValue={user.name ?? ""}
                  placeholder="Alex Lee"
                  required
                />
                <p className="text-xs text-slate-500">Shown on dashboards, billing, and notification emails.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className={labelClass}>Work email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className={inputClass}
                  defaultValue={user.email ?? ""}
                  placeholder="alex@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="image" className={labelClass}>Profile image URL</label>
                <input
                  id="image"
                  name="image"
                  className={inputClass}
                  defaultValue={user.image ?? ""}
                  placeholder="https://..."
                />
                <p className="text-xs text-slate-500">Optional. Paste a direct link to an avatar or logo.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className={labelClass}>Reset password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className={inputClass}
                  placeholder="Leave blank to keep current"
                />
                <p className="text-xs text-slate-500">Set a new temporary password; user will be prompted to change it.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="mainPage" className={labelClass}>Main Page</label>
                <select id="mainPage" name="mainPage" defaultValue={user.mainPage?.toString() ?? ""} className={inputClass}>
                  <option value="">Select a page to spotlight</option>
                  {pages.map((p) => {
                    const pid = p._id?.toString() ?? "";
                    return (
                      <option key={pid} value={pid}>
                        {p.name ?? pid}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainInstagram" className={labelClass}>Main Instagram</label>
                <select
                  id="mainInstagram"
                  name="mainInstagram"
                  defaultValue={user.mainInstagram?.toString() ?? ""}
                  className={inputClass}
                >
                  <option value="">Select an Instagram profile</option>
                  {instas.map((i) => {
                    const iid = i._id?.toString() ?? "";
                    return (
                      <option key={iid} value={iid}>
                        {i.username ?? iid}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainAd" className={labelClass}>Main Ad Account</label>
                <select id="mainAd" name="mainAd" defaultValue={user.mainAd?.toString() ?? ""} className={inputClass}>
                  <option value="">Select an ad account</option>
                  {ads.map((a) => {
                    const aid = a._id?.toString() ?? "";
                    return (
                      <option key={aid} value={aid}>
                        {a.name ?? aid}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainGoogleAd" className={labelClass}>Google Ads default</label>
                <select
                  id="mainGoogleAd"
                  name="mainGoogleAd"
                  defaultValue={user.mainGoogleAd?.toString() ?? ""}
                  className={inputClass}
                >
                  <option value="">Choose a Google Ads account</option>
                  {subAccounts.map((acc) => {
                    const sid = acc._id?.toString() ?? "";
                    return (
                      <option key={sid} value={sid}>
                        {acc.descriptiveName ?? acc.accountId ?? sid}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainSEOsites" className={labelClass}>SEO property</label>
                <select
                  id="mainSEOsites"
                  name="mainSEOsites"
                  defaultValue={user.mainSEOsites?.toString() ?? ""}
                  className={inputClass}
                >
                  <option value="">Choose a Search Console property</option>
                  {gscSite.map((g) => {
                    const gid = g._id?.toString() ?? "";
                    return (
                      <option key={gid} value={gid}>
                        {g.siteUrl ?? gid}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* <label
                htmlFor="isAdmin"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-200"
              >
                <input id="isAdmin" name="isAdmin" type="checkbox" className="h-4 w-4 accent-sky-600" defaultChecked={user.isAdmin} />
                Grant admin privileges
              </label> */}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                >
                  Save changes
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Created: {new Date(user.createdAt).toLocaleString()} • Updated:{" "}
              {new Date(user.updatedAt).toLocaleString()}
            </p>
          </div>
        </form>

        <div className="mt-6">
          <DeleteUserButton id={user._id?.toString() ?? ""} serverAction={deleteUserAction} />
        </div>
      </div>
    </div>
  );
}
