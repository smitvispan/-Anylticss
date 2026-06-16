import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminId = url.searchParams.get("adminId");

  const redirectUri = process.env.GOOGLE_REDIRECT_URL!;
  const clientId = process.env.GOOGLE_CLIENT_ID!;

  const scopes = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/adsdatahub",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "email",
    "profile",
    "openid"
  ].join(" ");

  const oauthUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${adminId}` +               // ← pass adminId here
    `&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(oauthUrl);
}
