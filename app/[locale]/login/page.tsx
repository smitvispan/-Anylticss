import AuthScreen from "@/components/partials/auth/auth-screen";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { redirect } from "next/navigation";

function extractAnalyticsWorkspaceId(value: string | null, locale: string) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  const pathname = value.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  const offset = segments[0] === locale ? 1 : 0;

  if (segments[offset] !== "analytics") {
    return null;
  }

  return segments[offset + 1] || null;
}

async function resolveLoginBrandName(workspaceId: string | null) {
  if (!workspaceId) {
    return null;
  }

  await connectDB();
  const workspace = await User.findById(workspaceId)
    .select({ _id: 1, name: 1, role: 1, parent_client_id: 1 })
    .lean();

  if (!workspace) {
    return null;
  }

  if (workspace.role === "user" && workspace.parent_client_id) {
    const parentClient = await User.findById(workspace.parent_client_id)
      .select({ _id: 1, name: 1 })
      .lean();

    return parentClient?.name || workspace.name || null;
  }

  return workspace.name || null;
}

export default async function LoginPage({
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
  const workspaceIdFromQuery =
    typeof sp?.workspaceId === "string"
      ? sp.workspaceId
      : Array.isArray(sp?.workspaceId)
        ? sp.workspaceId[0]
        : null;
  const workspaceId = workspaceIdFromQuery || extractAnalyticsWorkspaceId(callbackUrl, locale);
  const brandName = await resolveLoginBrandName(workspaceId);

  if (session?.user?.id) {
    if (session.user.role === "admin") {
      redirect(`/${locale}/admin`);
    }

    redirect(`/${locale}/analytics/${session.user.id}`);
  }

  return (
    <AuthScreen
      locale={locale}
      callbackUrl={callbackUrl}
      loginMode="user"
      brandName={brandName || "Vispan Solutions"}
      description={
        brandName
          ? `Sign in with your ${brandName} agency owner or team user account to access your analytics dashboard.`
          : "Sign in with your agency owner or team user account to access your analytics dashboard."
      }
    />
  );
}
