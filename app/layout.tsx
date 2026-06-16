// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import MountedProvider from "@/providers/mounted.provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

// language
import { getLangDir } from "rtl-detect";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import DirectionProvider from "@/providers/direction-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vispan Solutions Reports Dashboard",
  description: "created by vispansolutions",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();
  const direction = getLangDir(locale);

  return (
    <html lang={locale} dir={direction}>
      <body className={`${inter.className} dashcode-app`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MountedProvider>
              <DirectionProvider direction={direction}>
                {children}
              </DirectionProvider>
            </MountedProvider>
            <Toaster />
            <SonnerToaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
