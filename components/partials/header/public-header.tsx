"use client";

import React, { useMemo } from "react";
import { usePathname, useSearchParams, useParams } from "next/navigation";
import HeaderContent from "./header-content";
import ProfileInfo from "./profile-info";
import ThemeSwitcher from "./theme-switcher";
import { SidebarToggle } from "@/components/partials/sidebar/sidebar-toggle";
import { SheetMenu } from "@/components/partials/sidebar/menu/sheet-menu";
import HeaderLogo from "./header-logo";
import HorizontalMenu from "./horizontal-menu";
import DateRangeForm from "@/app/[locale]/(public)/analytics/[id]/page/_components/DateRangeForm";
import { useSession } from "next-auth/react";
import { useClientSession } from "@/providers/client-session.provider";
import { useWorkspace } from "@/providers/workspace.provider";

const PublicHeader = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const { data: nextAuthSession } = useSession();
  const clientSession = useClientSession();
  const workspace = useWorkspace();
  const idFromUrl = params?.id as string | undefined;

  const [dynamicRole, setDynamicRole] = React.useState<string | null>(null);
  const [dynamicName, setDynamicName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (idFromUrl && !workspace) {
      fetch(`/api/client/user-info?id=${idFromUrl}`)
        .then(res => res.json())
        .then(data => {
          if (data?.role) setDynamicRole(data.role);
          if (data?.name) setDynamicName(data.name);
        })
        .catch(() => null);
    }
  }, [idFromUrl, workspace]);

  const isAnalyticsArea = (pathname || "").includes("/analytics/");
  const session = isAnalyticsArea ? clientSession ?? nextAuthSession : nextAuthSession;

  const workspaceLabel = useMemo(() => {
    const current = pathname || "";
    if (current.includes("/analytics")) {
      const targetRole = workspace?.role || dynamicRole || session?.user?.role;
      if (targetRole === 'admin') return "Admin Workspace";
      if (targetRole === 'client') return "Client Workspace";
      if (targetRole === 'user') return "User Workspace";
      return "Analytics Workspace";
    }
    if (current.includes("/reports")) return "Reports";
    return "Workspace";
  }, [pathname, session, workspace, dynamicRole]);

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
            {(workspace?.name || dynamicName) && (
              <>
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-slate-900 font-bold uppercase tracking-wider">{workspace?.name || dynamicName}</span>
              </>
            )}
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
