import PublicPricingLanding from "@/components/subscription/public-pricing-landing";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import { redirect } from "next/navigation";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await getAnalyticsSession();
  const callbackUrl =
    typeof sp?.callbackUrl === "string"
      ? sp.callbackUrl
      : Array.isArray(sp?.callbackUrl)
        ? sp.callbackUrl[0]
        : null;

  if (session?.user?.id) {
    if (session.user.role === "admin") {
      redirect(`/${locale}/admin`);
    } else {
      redirect(`/${locale}/analytics/${session.user.id}`);
    }
  }

  if (callbackUrl) {
    return redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  await connectDB();
  const plans = await Plan.find({}).sort({ price: 1, createdAt: 1 }).lean();

  return (
    <PublicPricingLanding
      locale={locale}
      showDemoLinks
      plans={plans.map((plan: any) => ({
        _id: String(plan._id),
        name: String(plan.name || ""),
        price: Number(plan.price || 0),
        description: typeof plan.description === "string" ? plan.description : "",
        maxUsers: Number(plan.maxUsers ?? 0),
        maxFacebookPages: Number(plan.maxFacebookPages ?? 0),
        maxInstagramAccounts: Number(plan.maxInstagramAccounts ?? 0),
        maxAdAccounts: Number(plan.maxAdAccounts ?? 0),
        maxGoogleAdsAccounts: Number(plan.maxGoogleAdsAccounts ?? 0),
        maxSeoReports: Number(plan.maxSeoReports ?? 0),
        canResell: Boolean(plan.canResell),
        maxSubClients: Number(plan.maxSubClients ?? 0),
        validityMonths: Number(plan.validityMonths ?? 12),
      }))}
    />
  );
}
