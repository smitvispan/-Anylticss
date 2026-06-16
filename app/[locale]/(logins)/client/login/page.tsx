import { buildDemoLoginPath } from "@/lib/demo-login";
import { getSingleSearchParam, isTruthySearchParam } from "@/lib/login-page";
import { redirect } from "next/navigation";

const ClientLogin = async ({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
    const { locale } = await params;
    const sp = await searchParams;
    const callbackUrl = getSingleSearchParam(sp, "callbackUrl");
    const workspaceId = getSingleSearchParam(sp, "workspaceId");
    const demoPlan = getSingleSearchParam(sp, "plan") || getSingleSearchParam(sp, "demoPlan");
    const demoEnabled = isTruthySearchParam(getSingleSearchParam(sp, "demo"));

    if (demoEnabled && !callbackUrl && !workspaceId) {
        redirect(buildDemoLoginPath(locale, { mode: "client", plan: demoPlan }));
    }

    const queryParams = new URLSearchParams();
    if (callbackUrl) queryParams.set("callbackUrl", callbackUrl);
    if (workspaceId) queryParams.set("workspaceId", workspaceId);

    const query = queryParams.toString();
    redirect(`/${locale}/login${query ? `?${query}` : ""}`);
};

export default ClientLogin;
