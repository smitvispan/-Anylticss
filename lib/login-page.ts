import connectDB from "@/lib/mongodb";
import User from "@/models/User";
export {
  DEMO_LOGIN_CREDENTIALS,
  getDemoCredentials,
  normalizeDemoClientPlan,
  type DemoClientPlan,
} from "@/lib/demo-login";

export type LoginMode = "admin" | "client" | "user";
export type LoginSearchParams = Record<string, string | string[] | undefined>;

export function getSingleSearchParam(
  searchParams: LoginSearchParams | null | undefined,
  key: string
) {
  const value = searchParams?.[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export function isTruthySearchParam(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function extractAnalyticsWorkspaceId(value: string | null, locale: string) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  const pathname = value.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  const offset = segments[0] === locale ? 1 : 0;

  if (segments[offset] !== "analytics") {
    return null;
  }

  return segments[offset + 1] || null;
}

export async function resolveLoginBrandName(workspaceId: string | null) {
  if (!workspaceId) {
    return null;
  }

  await connectDB();
  const workspace = await User.findById(workspaceId)
    .select({ _id: 1, name: 1, role: 1, parent_client_id: 1 })
    .lean();

  if (!workspace) {
    return null;
  }

  if (workspace.role === "user" && workspace.parent_client_id) {
    const parentClient = await User.findById(workspace.parent_client_id)
      .select({ _id: 1, name: 1 })
      .lean();

    return parentClient?.name || workspace.name || null;
  }

  return workspace.name || null;
}
