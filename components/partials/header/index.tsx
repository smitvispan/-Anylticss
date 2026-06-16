"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import HeaderContent from "./header-content";
import HeaderSearch from "./header-search";
import ProfileInfo from "./profile-info";
import Notifications from "./notifications";
import Messages from "./messages";
import { Cart } from "./cart";
import ThemeSwitcher from "./theme-switcher";
import { SidebarToggle } from "@/components/partials/sidebar/sidebar-toggle";
import { SheetMenu } from "@/components/partials/sidebar/menu/sheet-menu";
import HorizontalMenu from "./horizontal-menu";
import LocalSwitcher from "./locale-switcher";
import HeaderLogo from "./header-logo";

const DashCodeHeader = () => {
  const pathname = usePathname();

  const { adminBase, newUserPath, accountPath, isAdminArea } = useMemo(() => {
    const normalized = pathname || "/";
    const cleaned = normalized.split("?")[0].split("#")[0];
    const segments = cleaned.replace(/\/$/, "").split("/").filter(Boolean);
    const locale = segments[0] ?? "en";
    const startsWithLocale = segments[0] && segments[0].length === 2;
    const base = startsWithLocale ? `/${locale}/admin` : "/admin";
    return {
      adminBase: base,
      newUserPath: `${base}/users/new`,
      accountPath: `${base}/account`,
      isAdminArea: cleaned.includes("/admin"),
    };
  }, [pathname]);

  return (
    <>
      <HeaderContent>
        <div className="flex items-center gap-3">
          <HeaderLogo />
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/80 backdrop-blur lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Admin console
          </div>
          <SidebarToggle />
          {/* <HeaderSearch /> */}
        </div>
        <div className="nav-tools flex items-center gap-2 md:gap-3">
          {isAdminArea && (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href={adminBase}
                className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-sm"
              >
                Users
              </Link>
              {/* <Link
                href={newUserPath}
                className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                New user
              </Link> */}
              <Link
                href={accountPath}
                className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              >
                Connect
              </Link>
            </div>
          )}
          {/* <LocalSwitcher /> */}
          {/* <ThemeSwitcher /> */}
          {/* <Cart /> */}
          {/* <Messages /> */}
          {/* <Notifications /> */}
          <ProfileInfo />
          <SheetMenu />
        </div>
      </HeaderContent>
      <HorizontalMenu />
    </>
  );
};

export default DashCodeHeader;
