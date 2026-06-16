import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import MountedProvider from "@/providers/mounted.provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
const inter = Inter({ subsets: ["latin"] });

// language
import { getLangDir } from "rtl-detect";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import DirectionProvider from "@/providers/direction-provider";
import AuthProvider from "@/providers/auth.provider";
import NetworkLoadingProvider from "@/providers/network-loading.provider";

export const metadata: Metadata = {
  title: "Vispan Solutions Reports Dashboard",
  description: "created by vispansolutions",
};

// ✅ params is a Promise in Next.js 15+, so make the layout async and await it
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages(); // if your setup requires, you can use getMessages({ locale })
  const direction = getLangDir(locale);

  return (
    <html lang={locale} dir={direction}>
      <body className={`${inter.className} dashcode-app `}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              <MountedProvider>
                <NetworkLoadingProvider>
                  <DirectionProvider direction={direction}>
                    {children}
                  </DirectionProvider>
                </NetworkLoadingProvider>
              </MountedProvider>
              <Toaster />
              <SonnerToaster />
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
