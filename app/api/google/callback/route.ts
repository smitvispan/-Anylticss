import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GoogleUser from "@/models/GoogleUser";
import { getAppBaseUrl, getRequiredEnv } from "@/lib/env";
import {
  buildGoogleSaveTokensPath,
  ConnectionOAuthError,
  decodeConnectionOAuthState,
  resolveConnectionContext,
} from "@/lib/connection-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "No code found" }, { status: 400 });
  }

  const oauthState = decodeConnectionOAuthState(rawState);
  let context;

  try {
    context = await resolveConnectionContext({
      requestedOwnerId: oauthState?.ownerId,
      requestedWorkspaceId: oauthState?.workspaceId,
      requestedLocale: oauthState?.locale,
    });
  } catch (error: any) {
    const status = error instanceof ConnectionOAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || "Unable to validate Google connection" },
      { status }
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: getRequiredEnv("GOOGLE_REDIRECT_URL"),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    return NextResponse.json(
      { error: "Failed to exchange code for tokens", details: errorBody },
      { status: tokenRes.status }
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string | undefined;
  const refreshToken = tokenData.refresh_token as string | undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token returned from Google" },
      { status: 400 }
    );
  }

  // Fetch the Google profile so we can persist the GoogleUser alongside tokens
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!profileRes.ok) {
    const errorBody = await profileRes.text();
    return NextResponse.json(
      { error: "Failed to fetch Google profile", details: errorBody },
      { status: profileRes.status }
    );
  }

  const profile = await profileRes.json();
  const googleId = profile.sub || profile.id;
  if (!googleId) {
    return NextResponse.json(
      { error: "Unable to read Google user id from profile" },
      { status: 400 }
    );
  }
  const profileEmail = profile.email || `${googleId}@google-oauth.local`;
  const profileName = profile.name || profileEmail || "Google User";
  const profilePic = profile.picture || "";

  const expiresAtSeconds =
    tokenData.expires_in && !Number.isNaN(Number(tokenData.expires_in))
      ? Math.floor(Date.now() / 1000) + Number(tokenData.expires_in)
      : null;

  await connectDB();

  await GoogleUser.findOneAndUpdate(
    { googleId },
    {
      googleId,
      email: profileEmail,
      name: profileName,
      profilePic,
      adminId: context.ownerId,
      accessToken,
      refreshToken,
      scope: tokenData.scope,
      expiresAt: expiresAtSeconds,
      tokenType: tokenData.token_type,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const redirectUrl = new URL(
    context.viewerRole === "admin"
      ? `/${context.locale}/admin/save-google-tokens`
      : buildGoogleSaveTokensPath(context),
    getAppBaseUrl(url.origin)
  );
  redirectUrl.searchParams.set("accessToken", accessToken);
  if (refreshToken) {
    redirectUrl.searchParams.set("refreshToken", refreshToken);
  }
  if (tokenData.scope) {
    redirectUrl.searchParams.set("scope", tokenData.scope);
  }
  if (tokenData.expires_in) {
    redirectUrl.searchParams.set("expiresAt", String(tokenData.expires_in));
  }
  redirectUrl.searchParams.set("googleId", googleId);
  if (profileEmail) redirectUrl.searchParams.set("email", profileEmail);
  if (profileName) redirectUrl.searchParams.set("name", profileName);
  if (profilePic) redirectUrl.searchParams.set("profilePic", profilePic);
  redirectUrl.searchParams.set("ownerId", context.ownerId);
  if (rawState) redirectUrl.searchParams.set("state", rawState);

  return NextResponse.redirect(redirectUrl.toString());
}
