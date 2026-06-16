import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";
import GoogleAdsAccount from "@/models/GoogleAdsAccount";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import { createUserAction } from "../actions";
import { Link } from "@/i18n/routing";

export default async function NewUserPage() {
  await connectDB();
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
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a new user</h1>
            <p className="mt-1 text-sm text-slate-600">Attach channels, seed credentials, and choose admin rights in one place.</p>
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
          action={createUserAction}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">User details</p>
                <p className="mt-1 text-base text-slate-700">
                  Fill in contact information and assign their default workspaces.
                </p>
              </div>
              <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">New seat</span>
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
                  placeholder="alex@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className={labelClass}>Temporary password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className={inputClass}
                  placeholder="Generate a secure passphrase"
                  required
                />
                <p className="text-xs text-slate-500">They will be prompted to update this on first login.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="image" className={labelClass}>Profile image URL</label>
                <input
                  id="image"
                  name="image"
                  className={inputClass}
                  placeholder="https://..."
                />
                <p className="text-xs text-slate-500">Optional. Paste a direct link to an avatar or logo.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="mainPage" className={labelClass}>Main Page</label>
                <select id="mainPage" name="mainPage" className={inputClass}>
                  <option value="">Select a page to spotlight</option>
                  {pages.map((p) => {
                    const id = p._id?.toString() ?? "";
                    return (
                      <option key={id} value={id}>
                        {p.name ?? id}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainInstagram" className={labelClass}>Main Instagram</label>
                <select id="mainInstagram" name="mainInstagram" className={inputClass}>
                  <option value="">Select an Instagram profile</option>
                  {instas.map((i) => {
                    const id = i._id?.toString() ?? "";
                    return (
                      <option key={id} value={id}>
                        {i.username ?? id}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainAd" className={labelClass}>Main Ad Account</label>
                <select id="mainAd" name="mainAd" className={inputClass}>
                  <option value="">Select an ad account</option>
                  {ads.map((a) => {
                    const id = a._id?.toString() ?? "";
                    return (
                      <option key={id} value={id}>
                        {a.name ?? id}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainGoogleAd" className={labelClass}>Google Ads default</label>
                <select id="mainGoogleAd" name="mainGoogleAd" className={inputClass}>
                  <option value="">Choose a Google Ads account</option>
                  {subAccounts.map((acc) => {
                    const id = acc._id?.toString() ?? "";
                    return (
                      <option key={id} value={id}>
                        {acc.descriptiveName ?? acc.accountId ?? id}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="mainSEOsites" className={labelClass}>SEO property</label>
                <select id="mainSEOsites" name="mainSEOsites" className={inputClass}>
                  <option value="">Choose a Search Console property</option>
                  {gscSite.map((g) => {
                    const id = g._id?.toString() ?? "";
                    return (
                      <option key={id} value={id}>
                        {g.siteUrl ?? id}
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
                <input id="isAdmin" name="isAdmin" type="checkbox" className="h-4 w-4 accent-sky-600" />
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
                  Create user
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
