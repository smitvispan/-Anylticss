import AuthScreen from "@/components/partials/auth/auth-screen";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { DEMO_LOGIN_CREDENTIALS, getDemoCredentials } from "@/lib/demo-login";
import {
  extractAnalyticsWorkspaceId,
  getSingleSearchParam,
  resolveLoginBrandName,
} from "@/lib/login-page";
import { redirect } from "next/navigation";

function CredentialCard({
  title,
  email,
  password,
}: {
  title: string;
  email: string;
  password: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-800">Email:</span>{" "}
          <code className="select-all rounded bg-white px-2 py-1 text-slate-900">{email}</code>
        </p>
        <p>
          <span className="font-medium text-slate-800">Password:</span>{" "}
          <code className="select-all rounded bg-white px-2 py-1 text-slate-900">{password}</code>
        </p>
      </div>
    </div>
  );
}

export default async function DemoLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await getAnalyticsSession();
  const mode = getSingleSearchParam(sp, "mode");
  const callbackUrl = getSingleSearchParam(sp, "callbackUrl");
  const workspaceIdFromQuery = getSingleSearchParam(sp, "workspaceId");
  const demoPlan = getSingleSearchParam(sp, "plan");
  const loginMode = mode === "user" ? "user" : "client";
  const workspaceId = workspaceIdFromQuery || extractAnalyticsWorkspaceId(callbackUrl, locale);
  const brandName = await resolveLoginBrandName(workspaceId);
  const demoCredentials = getDemoCredentials(loginMode, true, demoPlan);

  if (session?.user?.id) {
    if (session.user.role === "admin") {
      redirect(`/${locale}/admin`);
    }

    if (loginMode === "user" && session.user.role === "user") {
      redirect(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : `/${locale}/analytics/${session.user.id}`);
    }

    if (loginMode === "client" && session.user.role === "client") {
      redirect(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : `/${locale}/analytics/${session.user.id}`);
    }
  }

  const helperContent = (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Credentials</p>
      </div>
      <div className="grid gap-3">
        <CredentialCard
          title="Client Login"
          email={DEMO_LOGIN_CREDENTIALS.client.plan1.email}
          password={DEMO_LOGIN_CREDENTIALS.client.plan1.password}
        />
        <CredentialCard
          title="User Login"
          email={DEMO_LOGIN_CREDENTIALS.user.email}
          password={DEMO_LOGIN_CREDENTIALS.user.password}
        />
      </div>
    </div>
  );

  return (
    <AuthScreen
      locale={locale}
      callbackUrl={callbackUrl}
      loginMode={loginMode}
      brandName={brandName || "Vispan Solutions"}
      heading="Sign in"
      description="Use the credentials above to access your analytics dashboard."
      showBranding={false}
      showHeroPanel
      helperContent={helperContent}
      defaultEmail={demoCredentials?.email}
      defaultPassword={demoCredentials?.password}
    />
  );
}
