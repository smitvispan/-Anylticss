import { NextResponse } from "next/server";
import {
  ConnectionOAuthError,
  encodeConnectionOAuthState,
  resolveConnectionContext,
} from "@/lib/connection-oauth";
import { getMetaFacebookOauthBase } from "@/lib/meta-api";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URL;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing FACEBOOK_CLIENT_ID or FACEBOOK_REDIRECT_URL env" },
      { status: 500 }
    );
  }

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
      { error: error?.message || "Unable to start Facebook connection" },
      { status }
    );
  }

  const scopes = [
    "email",
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
    "ads_read",
  ].join(",");

  const oauthUrl =
    `${getMetaFacebookOauthBase()}/dialog/oauth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(oauthUrl);
}
