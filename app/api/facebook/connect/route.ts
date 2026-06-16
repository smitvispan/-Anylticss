import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminId = url.searchParams.get("adminId") ?? "";

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URL;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing FACEBOOK_CLIENT_ID or FACEBOOK_REDIRECT_URL env" },
      { status: 500 }
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
    "https://www.facebook.com/v19.0/dialog/oauth" +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(adminId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(oauthUrl);
}
