import { redirect } from "next/navigation";

export default async function UserDemoEntryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect(`/${locale}/user/login?demo=1&autologin=1`);
}
