import { getAnalyticsSession } from "@/lib/analytics-session-server";
import type { AnalyticsSessionUser } from "@/lib/analytics-session";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export class ConnectionOAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ConnectionOAuthState = {
  ownerId: string;
  workspaceId?: string | null;
  locale?: string | null;
};

export type ResolvedConnectionContext = {
  viewerId: string;
  viewerRole: AnalyticsSessionUser["role"];
  ownerId: string;
  workspaceId: string;
  locale: string;
};

function cleanValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown) {
  const locale = cleanValue(value);
  return locale || "en";
}

export function encodeConnectionOAuthState(state: ConnectionOAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeConnectionOAuthState(rawState: string | null | undefined) {
  const state = cleanValue(rawState);
  if (!state) return null;

  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as ConnectionOAuthState;
    const ownerId = cleanValue(parsed?.ownerId);

    if (!ownerId) {
      return null;
    }

    return {
      ownerId,
      workspaceId: cleanValue(parsed?.workspaceId) || null,
      locale: normalizeLocale(parsed?.locale),
    };
  } catch {
    return /^[a-f0-9]{24}$/i.test(state)
      ? {
          ownerId: state,
          workspaceId: null,
          locale: "en",
        }
      : null;
  }
}

async function resolveOwnedWorkspaceId(ownerId: string, requestedWorkspaceId: string) {
  if (!requestedWorkspaceId || requestedWorkspaceId === ownerId) {
    return ownerId;
  }

  await connectDB();
  const ownedUser = await User.findOne({
    _id: requestedWorkspaceId,
    parent_client_id: ownerId,
    role: "user",
    isAdmin: false,
  })
    .select({ _id: 1 })
    .lean();

  return ownedUser?._id ? requestedWorkspaceId : ownerId;
}

export async function resolveConnectionContext(params?: {
  requestedOwnerId?: string | null;
  requestedWorkspaceId?: string | null;
  requestedLocale?: string | null;
}) {
  const session = await getAnalyticsSession();

  if (!session?.user?.id) {
    throw new ConnectionOAuthError(401, "Not authenticated");
  }

  const viewerId = String(session.user.id);
  const viewerRole = session.user.role;
  const requestedOwnerId = cleanValue(params?.requestedOwnerId);
  const requestedWorkspaceId = cleanValue(params?.requestedWorkspaceId);
  const locale = normalizeLocale(params?.requestedLocale);

  if (viewerRole === "admin") {
    if (!requestedOwnerId) {
      throw new ConnectionOAuthError(400, "Missing owner id");
    }

    return {
      viewerId,
      viewerRole,
      ownerId: requestedOwnerId,
      workspaceId: requestedWorkspaceId || requestedOwnerId,
      locale,
    } satisfies ResolvedConnectionContext;
  }

  if (viewerRole === "client") {
    return {
      viewerId,
      viewerRole,
      ownerId: viewerId,
      workspaceId: await resolveOwnedWorkspaceId(viewerId, requestedWorkspaceId || viewerId),
      locale,
    } satisfies ResolvedConnectionContext;
  }

  if (viewerRole === "user") {
    await connectDB();
    const viewer = await User.findById(viewerId)
      .select({ parent_client_id: 1 })
      .lean();

    if (!viewer?.parent_client_id) {
      throw new ConnectionOAuthError(403, "User workspace is not linked to a client.");
    }

    return {
      viewerId,
      viewerRole,
      ownerId: String(viewer.parent_client_id),
      workspaceId: viewerId,
      locale,
    } satisfies ResolvedConnectionContext;
  }

  throw new ConnectionOAuthError(403, "Unsupported session role");
}

export function buildAnalyticsConnectionsPath(context: Pick<ResolvedConnectionContext, "locale" | "workspaceId">) {
  return `/${context.locale}/analytics/${context.workspaceId}/connections`;
}

export function buildGoogleSaveTokensPath(context: Pick<ResolvedConnectionContext, "locale" | "workspaceId">) {
  return `/${context.locale}/analytics/${context.workspaceId}/save-google-tokens`;
}
