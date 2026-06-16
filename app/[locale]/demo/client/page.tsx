import { redirect } from "next/navigation";

export default async function ClientDemoEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const queryParams = new URLSearchParams();
  const plan =
    typeof sp?.plan === "string"
      ? sp.plan
      : Array.isArray(sp?.plan)
        ? sp.plan[0]
        : null;
  const callbackUrl =
    typeof sp?.callbackUrl === "string"
      ? sp.callbackUrl
      : Array.isArray(sp?.callbackUrl)
        ? sp.callbackUrl[0]
        : null;
  const workspaceId =
    typeof sp?.workspaceId === "string"
      ? sp.workspaceId
      : Array.isArray(sp?.workspaceId)
        ? sp.workspaceId[0]
        : null;

  if (plan) queryParams.set("plan", plan);
  if (callbackUrl) queryParams.set("callbackUrl", callbackUrl);
  if (workspaceId) queryParams.set("workspaceId", workspaceId);

  const query = queryParams.toString();
  redirect(`/${locale}/demo/login${query ? `?${query}` : ""}`);
}
