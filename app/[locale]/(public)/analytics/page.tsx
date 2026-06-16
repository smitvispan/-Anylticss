import { getClientSession } from "@/lib/client-auth-server";
import { redirect } from "next/navigation";

export default async function AnalyticsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getClientSession();

  if (session?.user?.id) {
    redirect(`/${locale}/analytics/${session.user.id}`);
  }

  const searchParams = new URLSearchParams({
    callbackUrl: `/${locale}/analytics`,
  });
  redirect(`/${locale}/login?${searchParams.toString()}`);
}
