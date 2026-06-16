// app/[locale]/(protected)/layout.tsx
import LayoutProvider from "@/providers/layout.provider";
import LayoutContentProvider from "@/providers/content.provider";
import DashCodeSidebar from "@/components/partials/sidebar-admin";
import DashCodeFooter from "@/components/partials/footer";
import ThemeCustomize from "@/components/partials/customizer";
import DashCodeHeader from "@/components/partials/header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation"; // ✅ use Next's redirect

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;   // ✅ Next 15: params is a Promise
  const session = await auth();

  if (!session) redirect(`/${locale}`);

  return (
    <LayoutProvider>
      {/* <ThemeCustomize /> */}
      <DashCodeHeader />
      <DashCodeSidebar />
      <LayoutContentProvider>{children}</LayoutContentProvider>
      <DashCodeFooter />
    </LayoutProvider>
  );
}
