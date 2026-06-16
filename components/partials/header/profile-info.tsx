"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useSession, signOut } from "next-auth/react"; // ✅ v4 client helpers
import { usePathname, useParams } from "next/navigation";
import { useClientSession } from "@/providers/client-session.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { buildDemoLoginPath, getDemoClientPlanFromEmail } from "@/lib/demo-login";

function getLocaleFromPath(pathname: string) {
  const seg = pathname.split("/").filter(Boolean)[0];
  // You can refine this check to your supported locales
  return seg || "en";
}

function toAbsoluteClientUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

const ProfileInfo = () => {
  const { data: nextAuthSession } = useSession();               // ✅ client session
  const clientSession = useClientSession();
  const workspace = useWorkspace();
  const pathname = usePathname();
  const params = useParams();
  const idFromUrl = params?.id as string | undefined;

  const [dynamicName, setDynamicName] = useState<string | null>(null);
  const [dynamicEmail, setDynamicEmail] = useState<string | null>(null);

  useEffect(() => {
    if (idFromUrl && !workspace) {
      fetch(`/api/client/user-info?id=${idFromUrl}`)
        .then(res => res.json())
        .then(data => {
          if (data?.name) setDynamicName(data.name);
          if (data?.email) setDynamicEmail(data.email);
        })
        .catch(() => null);
    }
  }, [idFromUrl, workspace]);

  const locale = getLocaleFromPath(pathname || "");
  const isAnalyticsArea = (pathname || "").includes("/analytics/");
  const session = isAnalyticsArea ? clientSession ?? nextAuthSession : nextAuthSession;
  const role = session?.user?.role;
  const isAdminSession = role === "admin" || role === "superadmin";

  const avatar = session?.user?.image ?? "/images/avatars/default.png";
  const displayName = workspace?.name ?? dynamicName ?? session?.user?.name ?? "User";
  const alt = displayName.charAt(0) ?? "U";

  return (
    <div className="md:block hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="cursor-pointer">
          <div className="flex items-center gap-3 text-default-800">
            {/* <Image
              src={avatar}
              alt={alt}
              width={36}
              height={36}
              className="rounded-full"
            /> */}
            <div className="text-sm font-medium capitalize lg:block hidden">
              {displayName}
            </div>
            <span className="text-base me-2.5 lg:inline-block hidden">
              <Icon icon="heroicons-outline:chevron-down" />
            </span>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 p-0" align="end">
          <DropdownMenuLabel className="flex gap-2 items-center mb-1 p-3">
            {/* <Image
              src={avatar}
              alt={alt}
              width={36}
              height={36}
              className="rounded-full"
            /> */}
            <div>
              <div className="text-sm font-medium text-default-800 capitalize">
                {displayName}
              </div>
              <Link
                href={`/${locale}/dashboard/analytics`}
                className="text-xs text-default-600 hover:text-primary"
              >
                {dynamicEmail ?? session?.user?.email}
              </Link>
            </div>
          </DropdownMenuLabel>

          {/* <DropdownMenuGroup>
            {[
              { name: "profile", icon: "heroicons:user", href: `/${locale}/user-profile` },
              { name: "Billing", icon: "heroicons:megaphone", href: `/${locale}/dashboard` },
              { name: "Settings", icon: "heroicons:paper-airplane", href: `/${locale}/dashboard` },
              { name: "Keyboard shortcuts", icon: "heroicons:language", href: `/${locale}/dashboard` },
            ].map((item, i) => (
              <Link href={item.href} key={`info-menu-${i}`} className="cursor-pointer">
                <DropdownMenuItem className="flex items-center gap-2 text-sm font-medium text-default-600 capitalize px-3 py-1.5 cursor-pointer">
                  <Icon icon={item.icon} className="w-4 h-4" />
                  {item.name}
                </DropdownMenuItem>
              </Link>
            ))}
          </DropdownMenuGroup> */}

          <DropdownMenuSeparator />

          {/* ...your other menu groups... */}

          <DropdownMenuSeparator className="mb-0 dark:bg-background" />

          {/* ✅ Proper logout (client) */}
          <DropdownMenuItem
            className="flex items-center gap-2 text-sm font-medium text-default-600 capitalize my-1 px-3 cursor-pointer"
            onSelect={async (e) => {
              e.preventDefault();
              if (isAnalyticsArea && clientSession?.user?.id) {
                const payload = {
                  workspaceId: idFromUrl || null,
                  preferredRole: role === "client" || role === "user" ? role : null,
                };
                const demoClientPlan = role === "client"
                  ? getDemoClientPlanFromEmail(session?.user?.email)
                  : null;

                let redirectPath = `/${locale}/login`;

                try {
                  const res = await fetch("/api/client/logout", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json().catch(() => null);
                  const loggedOutRole = data?.role === "client" || data?.role === "user"
                    ? data.role
                    : payload.preferredRole;

                  if (loggedOutRole === "client") {
                    redirectPath = demoClientPlan
                      ? buildDemoLoginPath(locale, { mode: "client", plan: demoClientPlan })
                      : `/${locale}/client/login`;
                  } else if (loggedOutRole === "user") {
                    redirectPath =
                      session?.user?.email === "test@demo.com"
                        ? buildDemoLoginPath(locale, { mode: "user" })
                        : `/${locale}/user/login`;
                  }
                } catch {
                  if (payload.preferredRole === "client") {
                    redirectPath = demoClientPlan
                      ? buildDemoLoginPath(locale, { mode: "client", plan: demoClientPlan })
                      : `/${locale}/client/login`;
                  } else if (payload.preferredRole === "user") {
                    redirectPath =
                      session?.user?.email === "test@demo.com"
                        ? buildDemoLoginPath(locale, { mode: "user" })
                        : `/${locale}/user/login`;
                  }
                }

                window.location.assign(toAbsoluteClientUrl(redirectPath));
                return;
              }

              signOut({
                callbackUrl: toAbsoluteClientUrl(
                  isAdminSession ? `/${locale}/admin/login` : `/${locale}`
                ),
              });
            }}
          >
            <Icon icon="heroicons:power" className="w-4 h-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ProfileInfo;
