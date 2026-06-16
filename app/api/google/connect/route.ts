import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import {
  ConnectionOAuthError,
  encodeConnectionOAuthState,
  resolveConnectionContext,
} from "@/lib/connection-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const redirectUri = getRequiredEnv("GOOGLE_REDIRECT_URL");
  const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
  let state = "";

  try {
    const context = await resolveConnectionContext({
      requestedOwnerId: url.searchParams.get("adminId"),
      requestedWorkspaceId: url.searchParams.get("workspaceId"),
      requestedLocale: url.searchParams.get("locale"),
    });

    state = encodeConnectionOAuthState({
      ownerId: context.ownerId,
      workspaceId: context.workspaceId,
      locale: context.locale,
    });
  } catch (error: any) {
    const status = error instanceof ConnectionOAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || "Unable to start Google connection" },
      { status }
    );
  }

  const scopes = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/adsdatahub",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "email",
    "profile",
    "openid",
  ].join(" ");

  const oauthUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(oauthUrl);
}
