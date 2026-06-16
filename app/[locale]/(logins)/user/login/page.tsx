import { redirect } from "next/navigation";

const UserLogin = async ({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
    const { locale } = await params;
    const sp = await searchParams;
    const callbackUrl =
        typeof sp?.callbackUrl === "string"
            ? sp.callbackUrl
            : Array.isArray(sp?.callbackUrl)
                ? sp.callbackUrl[0]
                : null;

    redirect(`/${locale}/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
};

export default UserLogin;
