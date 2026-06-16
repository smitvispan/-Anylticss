import { redirect } from "next/navigation";

export default async function ClientDemoLoginRootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
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

  if (plan) params.set("plan", plan);
  if (callbackUrl) params.set("callbackUrl", callbackUrl);
  if (workspaceId) params.set("workspaceId", workspaceId);

  const query = params.toString();
  redirect(`/en/demo/login${query ? `?${query}` : ""}`);
}
