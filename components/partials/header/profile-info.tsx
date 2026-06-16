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
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useSession, signOut } from "next-auth/react"; // ✅ v4 client helpers
import { usePathname } from "next/navigation";

function getLocaleFromPath(pathname: string) {
  const seg = pathname.split("/").filter(Boolean)[0];
  // You can refine this check to your supported locales
  return seg || "en";
}

const ProfileInfo = () => {
  const { data: session } = useSession();               // ✅ client session
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname || "");

  const avatar = session?.user?.image ?? "/images/avatars/default.png";
  const alt = session?.user?.name?.charAt(0) ?? "U";

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
              {session?.user?.name ?? "User"}
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
                {session?.user?.name ?? "User"}
              </div>
              <Link
                href={`/${locale}/dashboard/analytics`}
                className="text-xs text-default-600 hover:text-primary"
              >
                {session?.user?.email}
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
            onSelect={(e) => {
              e.preventDefault();
              signOut({
                callbackUrl: `/${locale}`, // send back to localized login
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
