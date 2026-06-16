export type DemoClientPlan = "plan1" | "plan2";

type DemoLoginMode = "admin" | "client" | "user";

export const DEMO_LOGIN_CREDENTIALS = {
  client: {
    plan1: {
      email: "client-plan1@demo.com",
      password: "Demo@123",
    },
    plan2: {
      email: "client-plan2@demo.com",
      password: "Demo@123",
    },
  },
  user: {
    email: "test@demo.com",
    password: "Demo@123",
  },
} as const;

export function normalizeDemoClientPlan(value: string | null | undefined): DemoClientPlan {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "2" || normalized === "plan2" || normalized === "plan-2") {
    return "plan2";
  }

  return "plan1";
}

export function getDemoCredentials(
  loginMode: DemoLoginMode,
  enabled: boolean,
  planValue?: string | null
) {
  if (!enabled || loginMode === "admin") {
    return null;
  }

  if (loginMode === "client") {
    return DEMO_LOGIN_CREDENTIALS.client[normalizeDemoClientPlan(planValue)];
  }

  return DEMO_LOGIN_CREDENTIALS[loginMode];
}

export function getDemoClientPlanFromEmail(email: string | null | undefined): DemoClientPlan | null {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (normalizedEmail === DEMO_LOGIN_CREDENTIALS.client.plan1.email) {
    return "plan1";
  }

  if (normalizedEmail === DEMO_LOGIN_CREDENTIALS.client.plan2.email) {
    return "plan2";
  }

  return null;
}

export function isDemoClientEmail(email: string | null | undefined) {
  return getDemoClientPlanFromEmail(email) !== null;
}

export function buildDemoLoginPath(
  locale: string,
  options?: {
    mode?: "client" | "user";
    plan?: string | null;
  }
) {
  const params = new URLSearchParams();

  if (options?.mode === "user") {
    params.set("mode", "user");
  } else {
    const plan = normalizeDemoClientPlan(options?.plan);
    if (plan === "plan2") {
      params.set("plan", "2");
    }
  }

  const query = params.toString();
  return `/${locale}/demo/login${query ? `?${query}` : ""}`;
}

export function buildDemoClientLoginPath(locale: string, planValue?: string | null) {
  return buildDemoLoginPath(locale, { mode: "client", plan: planValue });
}
