import AuthScreen from "@/components/partials/auth/auth-screen";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { redirect } from "next/navigation";

const AdminLogin = async ({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
    const { locale } = await params;
    const sp = await searchParams;
    const session = await getAnalyticsSession();
    const callbackUrl =
        typeof sp?.callbackUrl === "string"
            ? sp.callbackUrl
            : Array.isArray(sp?.callbackUrl)
                ? sp.callbackUrl[0]
                : null;

    // Only redirect if an Admin is logged in. 
    // If a Client/User is logged in, allow them to see the Admin login screen to authenticate separately.
    if (session?.user?.id && session.user.role === "admin") {
        redirect(`/${locale}/admin`);
    }

    return (
        <AuthScreen
            locale={locale}
            callbackUrl={callbackUrl || `/${locale}/admin`}
            loginMode="admin"
            description="Sign in with your admin account to manage the system."
            showBranding={false}
        />
    );
};

export default AdminLogin;
