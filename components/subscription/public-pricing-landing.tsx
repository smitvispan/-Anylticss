import { Link } from "@/i18n/routing";
import { PLAN_CATALOG, getPlanDisplayName, isCustomPlanTier } from "@/lib/plan-catalog";
import { formatPlanLimit } from "@/lib/plan-limits";
import PublicPlanSignupButton from "@/components/subscription/public-plan-signup-button";
import CustomPlanRequestButton from "@/components/subscription/custom-plan-request-button";

type PricingPlan = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  maxUsers: number;
  maxFacebookPages: number;
  maxInstagramAccounts: number;
  maxAdAccounts: number;
  maxGoogleAdsAccounts: number;
  maxSeoReports: number;
  canResell: boolean;
  maxSubClients: number;
  validityMonths: number;
  featureBullets?: string[];
};

type PublicPricingLandingProps = {
  locale: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  footerNote?: string;
  showSignIn?: boolean;
  defaultAgencyName?: string;
  defaultWebsite?: string;
  defaultEmail?: string;
  demoMode?: boolean;
  showDemoLinks?: boolean;
  plans?: PricingPlan[];
};

export default function PublicPricingLanding({
  locale,
  eyebrow = "Digital Marketing Dashboard",
  title = "Choose A Plan And Launch Your Agency Workspace",
  description = "Click any plan, complete agency registration, pay securely with Razorpay, and start managing reports plus team users from your own dashboard.",
  footerNote = "After payment your agency workspace will be activated. You can then log in, connect reports, and create users with report-level access.",
  showSignIn = true,
  defaultAgencyName = "",
  defaultWebsite = "",
  defaultEmail = "",
  demoMode = false,
  showDemoLinks = false,
  plans = PLAN_CATALOG,
}: PublicPricingLandingProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#ffffff_45%,_#f8fafc)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-600">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>
          </div>

          {showSignIn && (
            <div className="flex items-center gap-3">
              {showDemoLinks ? (
                <>
                  <Link
                    href="/demo/login"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Client Demo
                  </Link>
                  <Link
                    href="/demo/login?mode=user"
                    className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5"
                  >
                    User Demo
                  </Link>
                </>
              ) : null}
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
              >
                Sign In
              </Link>
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const isZeroPrice = Number(plan.price || 0) <= 0;
            const isCustom = isCustomPlanTier(plan) || isZeroPrice;
            const featureBullets = Array.isArray(plan.featureBullets) && plan.featureBullets.length
              ? plan.featureBullets
              : (PLAN_CATALOG.find((entry) => entry.name.toLowerCase() === String(plan.name || "").toLowerCase())?.featureBullets || []);

            return (
              <article
                key={plan._id}
                className={`flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white/90 shadow-xl ring-1 ring-slate-100/70 backdrop-blur ${
                  index === 1 ? "border-sky-400" : "border-slate-200"
                }`}
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-slate-50 px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">
                        {index === 1 ? "Most Popular" : "Agency Plan"}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-slate-950">{getPlanDisplayName(plan)}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-950">
                        {isCustom ? getPlanDisplayName(plan) : `₹${plan.price}`}
                      </p>
                      {!isCustom && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">per year</p>}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
                </div>

                <div className="flex flex-1 flex-col px-6 py-6">
                  <div className="grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Users</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{formatPlanLimit(plan.maxUsers)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">SEO Reports</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{isCustom ? getPlanDisplayName(plan) : formatPlanLimit(plan.maxSeoReports)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Google Ads Accounts</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{formatPlanLimit(plan.maxGoogleAdsAccounts)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Reseller</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{plan.canResell ? "Available" : "No"}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex-1 space-y-3">
                    {featureBullets.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 rounded-2xl bg-white px-3 py-2.5">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700">
                          ✓
                        </span>
                        <span className="text-sm leading-6 text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    {isCustom ? (
                      <CustomPlanRequestButton
                        planName={getPlanDisplayName(plan)}
                        triggerLabel={isZeroPrice ? `Choose ${getPlanDisplayName(plan)}` : "Request Own Plan"}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      />
                    ) : (
                      <PublicPlanSignupButton
                        locale={locale}
                        plan={{
                          _id: plan._id,
                          name: getPlanDisplayName(plan),
                          price: Number(plan.price || 0),
                        }}
                        defaultAgencyName={defaultAgencyName}
                        defaultWebsite={defaultWebsite}
                        defaultEmail={defaultEmail}
                        demoMode={demoMode}
                      />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="mt-10 rounded-[2rem] border border-slate-200 bg-white/80 px-6 py-6 text-sm text-slate-600 shadow-sm">
          {footerNote}
        </footer>
      </div>
    </main>
  );
}
