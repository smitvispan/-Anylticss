

export type SubChildren = {
  href: string;
  label: string;
  active: boolean;
  children?: SubChildren[];
};
export type Submenu = {
  href: string;
  label: string;
  active: boolean;
  icon: any;
  submenus?: Submenu[];
  children?: SubChildren[];
};

export type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: any;
  submenus: Submenu[];
  id: string;
};

export type Group = {
  groupLabel: string;
  menus: Menu[];
  id: string;
};

export function getMenuList(
  pathname: string,
  t: any,
  user: any = null,
  targetRole?: string,
  assignments?: any
): Group[] {
  const role = user?.role;
  if (!role) return []; // Return empty if no role (session loading)
  const isTeamUser = (targetRole || role) === "user";

  const segments = pathname.replace(/\/$/, "").split("/");
  const analyticsIdx = segments.findIndex(s => s === "analytics");
  const idInPath = analyticsIdx !== -1 && segments[analyticsIdx + 1] ? segments[analyticsIdx + 1] : null;

  const basePath = idInPath
    ? segments.slice(0, analyticsIdx + 2).join("/") + "/"
    : pathname.replace(/\/$/, "").split("/").slice(0, -1).join("/") + "/";

  const lastSegment = segments[segments.length - 1];

  const _menuList: Group[] = [
    {
      groupLabel: "",
      id: "overview",
      menus: [
        {
          id: "overview",
          href: basePath + "page",
          label: "Facebook Page",
          active: lastSegment === "page",
          icon: "lucide:layout-dashboard",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "",
      id: "instagram",
      menus: [
        {
          id: "instagram",
          href: basePath + "instagram",
          label: "Instagram Page",
          active: lastSegment === "instagram",
          icon: "lucide:instagram",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "",
      id: "metaads",
      menus: [
        {
          id: "metaads",
          href: basePath + "metaads",
          label: "Meta Ads",
          active: lastSegment === "metaads",
          icon: "lucide:megaphone",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "",
      id: "googleads",
      menus: [
        {
          id: "googleads",
          href: basePath + "googleads",
          label: "Google Ads",
          active: lastSegment === "googleads",
          icon: "lucide:circle-dollar-sign",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "",
      id: "seo",
      menus: [
        {
          id: "seo",
          href: basePath + "seo",
          label: "SEO Reports",
          active: lastSegment === "seo",
          icon: "lucide:search",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "",
      id: "connections",
      menus: [
        {
          id: "connections",
          href: basePath + "connections",
          label: "Connect All",
          active: lastSegment === "connections",
          icon: "lucide:link",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "Management",
      id: "management",
      menus: [
        {
          id: "team",
          href: basePath + "users",
          label: "Team",
          active: lastSegment === "users",
          icon: "lucide:users",
          submenus: [],
        },
        {
          id: "plan",
          href: basePath + "subscription",
          label: "Plan",
          active: lastSegment === "subscription",
          icon: "lucide:credit-card",
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "System",
      id: "system",
      menus: [
        {
          id: "subscription-plans",
          href: basePath + "plans",
          label: "Subscription Plans",
          active: lastSegment === "plans",
          icon: "lucide:layers",
          submenus: [],
        },
        {
          id: "payments",
          href: basePath + "payments",
          label: "Payments",
          active: lastSegment === "payments",
          icon: "lucide:receipt-text",
          submenus: [],
        },
      ],
    }
  ];

  if (isTeamUser) {
    return _menuList.map(group => {
      return {
        ...group,
        menus: group.menus.filter(menu => {
          if (menu.id === "team" || menu.id === "plan" || menu.id === "sub-clients" || menu.id === "subscription-plans" || menu.id === "payments" || menu.id === "connections") return false;

          if (assignments) {
            if (menu.id === "overview" && !assignments.mainPage) return false;
            if (menu.id === "instagram" && !assignments.mainInstagram) return false;
            if (menu.id === "metaads" && !assignments.mainAd) return false;
            if (menu.id === "googleads" && !assignments.mainGoogleAd) return false;
            if (menu.id === "seo" && !assignments.mainSEOsites) return false;
          }
          return true;
        })
      }
    }).filter(group => group.menus.length > 0);
  }

  return _menuList;
}

export function getHorizontalMenuList(pathname: string, t: any, user: any = null, targetRole?: string): Group[] {
  return getMenuList(pathname, t, user, targetRole);
}
