// app/[locale]/(protected)/layout.tsx
import LayoutProvider from "@/providers/layout.provider";
import LayoutContentProvider from "@/providers/content.provider";
import DashCodeSidebar from "@/components/partials/sidebar-admin";
import DashCodeFooter from "@/components/partials/footer";
import ThemeCustomize from "@/components/partials/customizer";
import DashCodeHeader from "@/components/partials/header";
import AuthScreen from "@/components/partials/auth/auth-screen";
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
  const role = session?.user?.role;
  const isAdminSession = role === "admin" || role === "superadmin";

  if (!session || !isAdminSession) {
    redirect(`/${locale}/admin/login`);
  }

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
