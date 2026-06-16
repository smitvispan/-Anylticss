import SeoDashboardClient from "./_components/SeoDashboardClient";

export default async function SeoDashboardPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const resolved = await params;
  const userId = resolved?.id || "";

  return <SeoDashboardClient userId={userId} />;
}
