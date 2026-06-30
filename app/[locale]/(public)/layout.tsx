// app/[locale]/(public)/layout.tsx
import type { ReactNode } from "react";
import LayoutProvider from "@/providers/layout.provider";
import LayoutContentProvider from "@/providers/content.provider";
import DashCodeSidebar from "@/components/partials/sidebar";
import ThemeCustomize from "@/components/partials/customizer";
import PublicHeader from "@/components/partials/header/public-header";
import PublicFooter from "@/components/partials/footer/public-footer";
import { getClientSession } from "@/lib/client-auth-server";
import { ClientSessionProvider } from "@/providers/client-session.provider";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const clientSession = await getClientSession();

  return (
    <ClientSessionProvider session={clientSession}>
      <LayoutProvider>
        <ThemeCustomize />
        <PublicHeader />
        <DashCodeSidebar />
        <LayoutContentProvider>{children}</LayoutContentProvider>
        <PublicFooter />
      </LayoutProvider>
    </ClientSessionProvider>
  );
}
