"use client";

import React, { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import HeaderContent from "./header-content";
import ProfileInfo from "./profile-info";
import ThemeSwitcher from "./theme-switcher";
import { SidebarToggle } from "@/components/partials/sidebar/sidebar-toggle";
import { SheetMenu } from "@/components/partials/sidebar/menu/sheet-menu";
import HeaderLogo from "./header-logo";
import HorizontalMenu from "./horizontal-menu";
import DateRangeForm from "@/app/[locale]/(public)/analytics/[id]/page/_components/DateRangeForm";

const PublicHeader = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const workspaceLabel = useMemo(() => {
    const current = pathname || "";
    if (current.includes("/analytics")) return "Analytics workspace";
    if (current.includes("/reports")) return "Reports";
    return "Workspace";
  }, [pathname]);

  const getPrevMonthRange = () => {
    const today = new Date();
    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
    const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
    const toISODate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: toISODate(firstOfPrevMonth), end: toISODate(lastOfPrevMonth) };
  };

  const defaults = useMemo(() => getPrevMonthRange(), []);
  const startParam = searchParams?.get("start");
  const endParam = searchParams?.get("end");
  const initialStart = startParam || defaults.start;
  const initialEnd = endParam || defaults.end;
  const showDateRange = (pathname || "").includes("/analytics/");

  return (
    <>
      <HeaderContent>
        <div className="flex items-center gap-3">
          <HeaderLogo />
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/80 backdrop-blur lg:flex">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            {workspaceLabel}
          </div>
          <SidebarToggle />
        </div>
        <div className="nav-tools flex items-center gap-2 md:gap-3">
          {showDateRange && (
            <div className="hidden md:block">
              <DateRangeForm initialStart={initialStart} initialEnd={initialEnd} autoApply={false} />
            </div>
          )}
          <ThemeSwitcher />
          <ProfileInfo />
          <SheetMenu />
        </div>
      </HeaderContent>
      <HorizontalMenu />
    </>
  );
};

export default PublicHeader;
