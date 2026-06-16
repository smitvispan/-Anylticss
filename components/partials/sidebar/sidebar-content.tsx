"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/hooks/use-config";
import { useMenuHoverConfig } from "@/hooks/use-menu-hover";
import { usePathname } from "@/components/navigation";

const SidebarContent = ({ children }: { children: React.ReactNode }) => {
  const [config] = useConfig();
  const [hoverConfig, setHoverConfig] = useMenuHoverConfig();
  const pathname = usePathname();

  const sectionLabel = React.useMemo(() => {
    const cleaned = (pathname || "").split("?")[0].replace(/\/$/, "");
    const segments = cleaned.split("/").filter(Boolean);
    const slug = segments[segments.length - 1] ?? "";
    const labelMap: Record<string, string> = {
      page: "Facebook Page",
      instagram: "Instagram Page",
      metaads: "Meta Ads",
      googleads: "Google Ads",
      seo: "SEO Reports",
    };
    return labelMap[slug] ?? (slug ? slug.replace(/-/g, " ") : "Reports");
  }, [pathname]);

  if (config.menuHidden || config.layout === "horizontal") return null;

  if (config.sidebar === "two-column") {
    return (
      <aside className={cn("fixed z-50 h-full xl:flex hidden", {})}>
        <div className=" relative flex h-full ">{children}</div>
      </aside>
    );
  }

  return (
    <aside
      onMouseEnter={() =>
        config.sidebar === "classic" && setHoverConfig({ hovered: true })
      }
      onMouseLeave={() =>
        config.sidebar === "classic" && setHoverConfig({ hovered: false })
      }
      className={cn(
        "fixed z-50 w-[248px] bg-white text-slate-900 shadow-base xl:block hidden border-r border-slate-200",
        {
          [`dark theme-${config.sidebarColor}`]:
            config.sidebarColor !== "light",
          "w-[72px]": config.collapsed && config.sidebar !== "compact",
          "border-b": config.skin === "bordered",
          "shadow-base": config.skin === "default",
          "h-full start-0":
            config.layout !== "semi-box" && config.layout !== "compact",
          "m-6 bottom-0 top-0  start-0   rounded-md":
            config.layout === "semi-box",
          "m-10 bottom-0 top-0  start-0   ": config.layout === "compact",
          "w-28": config.sidebar === "compact",
          "w-[248px]": hoverConfig.hovered,
        }
      )}
    >
      <div className=" relative  flex flex-col h-full  ">
        {config.sidebarBgImage !== undefined && (
          <div
            className=" absolute left-0 top-0   z-[-1] w-full h-full bg-cover bg-center opacity-[0.07]"
            style={{ backgroundImage: `url(${config.sidebarBgImage})` }}
          ></div>
        )}
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Reports
          </p>
          <p className="text-sm font-semibold text-slate-900">
            Vispan Solutions
          </p>
          <p className="text-[11px] text-slate-600">{sectionLabel}</p>
        </div>
        <div className="flex-1 overflow-visible">{children}</div>
      </div>
    </aside>
  );
};

export default SidebarContent;
