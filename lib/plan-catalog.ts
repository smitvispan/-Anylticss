export const PLAN_TIER_IDS = {
  plan1: "69e1bcc7bde23579c1da73bb",
  plan2: "69e1bcc7bde23579c1da73bd",
  custom: "69e1bcc7bde23579c1da73bf",
} as const;

export type PlanCatalogEntry = {
  _id: string;
  name: string;
  legacyNames: string[];
  price: number;
  description: string;
  maxUsers: number;
  maxFacebookPages: number;
  maxInstagramAccounts: number;
  maxAdAccounts: number;
  maxGoogleAdsAccounts: number;
  maxSeoReports: number;
  canResell: boolean;
  maxSubClients: number;
  validityMonths: number;
  customRequest?: boolean;
  featureBullets: string[];
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    _id: PLAN_TIER_IDS.plan1,
    name: "Plan 1",
    legacyNames: ["Basic"],
    price: 100,
    description: "1 SEO report slot for one agency with unlimited user creation.",
    maxUsers: -1,
    maxFacebookPages: 1,
    maxInstagramAccounts: 1,
    maxAdAccounts: 1,
    maxGoogleAdsAccounts: 1,
    maxSeoReports: 1,
    canResell: false,
    maxSubClients: 0,
    validityMonths: 12,
    featureBullets: [
      "Unlimited users",
      "1 SEO report / property",
      "1 Google Ads account",
      "1 Meta channel per type",
    ],
  },
  {
    _id: PLAN_TIER_IDS.plan2,
    name: "Plan 2",
    legacyNames: ["Professional"],
    price: 500,
    description: "Up to 5 SEO report slots for one agency with unlimited user creation.",
    maxUsers: -1,
    maxFacebookPages: 5,
    maxInstagramAccounts: 5,
    maxAdAccounts: 5,
    maxGoogleAdsAccounts: 5,
    maxSeoReports: 5,
    canResell: false,
    maxSubClients: 0,
    validityMonths: 12,
    featureBullets: [
      "Unlimited users",
      "Up to 5 SEO reports / properties",
      "Up to 5 Google Ads accounts",
      "Per-user report assignment",
    ],
  },
  {
    _id: PLAN_TIER_IDS.custom,
    name: "Own Plan",
    legacyNames: ["Custom", "Reseller Elite"],
    price: 2000,
    description: "Custom SEO report volume, report mapping, and reseller onboarding.",
    maxUsers: -1,
    maxFacebookPages: -1,
    maxInstagramAccounts: -1,
    maxAdAccounts: -1,
    maxGoogleAdsAccounts: -1,
    maxSeoReports: -1,
    canResell: true,
    maxSubClients: -1,
    validityMonths: 12,
    customRequest: true,
    featureBullets: [
      "Unlimited users",
      "Custom SEO report capacity",
      "Per-user report mapping",
      "Reseller / white-label onboarding",
    ],
  },
];

function normalizeId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    const record = value as Record<string, unknown>;
    return typeof record._id === "string" ? record._id : String(record._id || "");
  }
  return String(value);
}

function normalizeName(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "object" && "name" in (value as Record<string, unknown>)) {
    const record = value as Record<string, unknown>;
    return typeof record.name === "string" ? record.name.trim().toLowerCase() : "";
  }
  return "";
}

export function getPlanCatalogEntry(plan?: unknown) {
  const planId = normalizeId(plan);
  const planName = normalizeName(plan);

  return (
    PLAN_CATALOG.find((entry) => entry._id === planId) ||
    PLAN_CATALOG.find((entry) => {
      const candidates = [entry.name, ...entry.legacyNames].map((item) => item.trim().toLowerCase());
      return candidates.includes(planName);
    }) ||
    null
  );
}

export function getPlanDisplayName(plan?: unknown) {
  const entry = getPlanCatalogEntry(plan);
  if (entry) return entry.name;

  if (typeof plan === "string" && plan.trim()) {
    return plan.trim();
  }

  if (plan && typeof plan === "object" && "name" in (plan as Record<string, unknown>)) {
    const rawName = (plan as Record<string, unknown>).name;
    if (typeof rawName === "string" && rawName.trim()) {
      return rawName.trim();
    }
  }

  return "Plan";
}

export function isCustomPlanTier(plan?: unknown) {
  return Boolean(getPlanCatalogEntry(plan)?.customRequest);
}

export function getPlanFeatureBullets(plan?: unknown) {
  return getPlanCatalogEntry(plan)?.featureBullets || [];
}
