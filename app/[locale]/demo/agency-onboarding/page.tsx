import PublicPricingLanding from "@/components/subscription/public-pricing-landing";

export default async function AgencyOnboardingDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PublicPricingLanding
      locale={locale}
      eyebrow="Agency Signup Demo"
      title="Demo: Test Plan, Payment, Registration, And Login"
      description="Use this page to test the full agency onboarding flow. Choose a plan, submit the registration form, complete payment, and verify that your new agency workspace opens correctly."
      footerNote="Demo defaults are prefilled for agency name and email. Use a fresh email address each time you test registration so the new agency owner account can be created successfully."
      defaultAgencyName="Main Agency Demo"
      defaultWebsite="vispansolution.com"
      demoMode
    />
  );
}
