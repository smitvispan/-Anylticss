import type { Metadata } from "next";
import "./globals.css";

// language
import AuthProvider from "@/providers/auth.provider";
import NetworkLoadingProvider from "@/providers/network-loading.provider";

export const metadata: Metadata = {
  title: "Vispan Solutions Reports Dashboard",
  description: "created by vispansolutions",
};

// ✅ params is a Promise in Next.js 15+, so make the layout async and await it
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  await params;

  return (
    <AuthProvider>
      <NetworkLoadingProvider>
        {children}
      </NetworkLoadingProvider>
    </AuthProvider>
  );
}
