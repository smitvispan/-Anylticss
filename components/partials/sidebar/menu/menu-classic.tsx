"use client";

import React from 'react'
import { Ellipsis, LogOut } from "lucide-react";
import { usePathname } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { getMenuList } from "@/lib/menus";
import { useClientSession } from "@/providers/client-session.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from "@/components/ui/tooltip";
import { useConfig } from "@/hooks/use-config";
import MenuLabel from "../common/menu-label";
import MenuItem from "../common/menu-item";
import { CollapseMenuButton } from "../common/collapse-menu-button";
import MenuWidget from "../common/menu-widget";
import SearchBar from '@/components/partials/sidebar/common/search-bar'
import TeamSwitcher from '../common/team-switcher'
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation'
import { getLangDir } from 'rtl-detect';
import Logo from '@/components/logo';
import SidebarHoverToggle from '@/components/partials/sidebar/sidebar-hover-toggle';
import { useMenuHoverConfig } from '@/hooks/use-menu-hover';
import { useMediaQuery } from '@/hooks/use-media-query';


export function MenuClassic({ }) {
    // translate
    const t = useTranslations("Menu")
    const pathname = usePathname();
    const params = useParams<{ locale: string; id?: string }>();
    const direction = getLangDir(params?.locale ?? '');

    const isDesktop = useMediaQuery('(min-width: 1280px)')


    const { data: nextAuthSession } = useSession();
    const clientSession = useClientSession();
    const isAnalyticsArea = (pathname || "").includes("/analytics/");
    const session = isAnalyticsArea ? clientSession ?? nextAuthSession : nextAuthSession;
    const workspace = useWorkspace();
    const [dynamicRole, setDynamicRole] = React.useState<string | null>(null);
    const idFromUrl = params?.id as string | undefined;

    React.useEffect(() => {
        if (idFromUrl && !workspace) {
            fetch(`/api/client/user-info?id=${idFromUrl}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.role) setDynamicRole(data.role);
                })
                .catch(() => null);
        }
    }, [idFromUrl, workspace]);

    const shouldResolveTargetRole = !!idFromUrl && !workspace;
    const resolvedTargetRole = workspace?.role || dynamicRole || undefined;
    const menuUser = shouldResolveTargetRole && !resolvedTargetRole ? null : session?.user;
    const menuList = getMenuList(pathname, t, menuUser, resolvedTargetRole, workspace?.assignments);
    const [config, setConfig] = useConfig()
    const collapsed = config.collapsed
    const [hoverConfig] = useMenuHoverConfig();
    const { hovered } = hoverConfig;

    const scrollableNodeRef = React.useRef<HTMLDivElement>(null);
    const [scroll, setScroll] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            if (scrollableNodeRef.current && scrollableNodeRef.current.scrollTop > 0) {
                setScroll(true);
            } else {
                setScroll(false);
            }
        };
        scrollableNodeRef.current?.addEventListener("scroll", handleScroll);
    }, [scrollableNodeRef]);

    return (
        <>
            {isDesktop && (
                <div className="flex items-center justify-between  px-4 py-4">
                    <Logo />
                    <SidebarHoverToggle />
                </div>
            )}




            <ScrollArea className="[&>div>div[style]]:block!" dir={direction}>
                {isDesktop && (
                    <div className={cn(' space-y-3 mt-6 ', {
                        'px-4': !collapsed || hovered,
                        'text-center': collapsed || !hovered
                    })}>

                        {/* <TeamSwitcher /> */}
                        <SearchBar />
                    </div>

                )}

                <nav className="mt-8 h-full w-full">
                    <ul className=" h-full flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-4">
                        {menuList?.map(({ groupLabel, menus }, index) => (
                            <li className={cn("w-full", groupLabel ? "" : "")} key={index}>
                                {(!collapsed || hovered) && groupLabel || !collapsed === undefined ? (
                                    <MenuLabel label={groupLabel} />
                                ) : collapsed && !hovered && !collapsed !== undefined && groupLabel ? (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={100}>
                                            <TooltipTrigger className="w-full">
                                                <div className="w-full flex justify-center items-center">
                                                    <Ellipsis className="h-5 w-5 text-default-700" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>{groupLabel}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    null
                                )}

                                {menus.map(
                                    ({ href, label, icon, active, id, submenus }, index) =>
                                        submenus.length === 0 ? (
                                            <div className="w-full mb-2 last:mb-0" key={index}>
                                                <TooltipProvider disableHoverableContent>
                                                    <Tooltip delayDuration={100}>
                                                        <TooltipTrigger asChild>

                                                            <div>

                                                                <MenuItem label={label} icon={icon} href={href} active={active} id={id} collapsed={collapsed} />
                                                            </div>
                                                        </TooltipTrigger>
                                                        {collapsed && (
                                                            <TooltipContent side="right">
                                                                {label}
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        ) : (
                                            <div className="w-full mb-2" key={index}>
                                                <CollapseMenuButton
                                                    icon={icon}
                                                    label={label}
                                                    active={active}
                                                    submenus={submenus}
                                                    collapsed={collapsed}
                                                    id={id}

                                                />
                                            </div>
                                        )
                                )}

                            </li>
                        ))}
                        {!collapsed && (
                            <li className="w-full grow flex items-end">
                                <MenuWidget />
                            </li>
                        )}
                    </ul>
                </nav>

            </ScrollArea>
        </>
    );
}
