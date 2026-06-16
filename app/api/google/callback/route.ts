import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import GoogleUser from "@/models/GoogleUser";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  const adminId = session?.user?.id;
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code found" }, { status: 400 });
  }

  const state = url.searchParams.get("state") ?? undefined;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URL!,
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

  const expiresAtMs =
    tokenData.expires_in && !Number.isNaN(Number(tokenData.expires_in))
      ? Date.now() + Number(tokenData.expires_in) * 1000
      : null;

  await connectDB();

  await GoogleUser.findOneAndUpdate(
    { googleId },
    {
      googleId,
      email: profileEmail,
      name: profileName,
      profilePic,
      adminId,
      accessToken,
      refreshToken,
      scope: tokenData.scope,
      expiresAt: expiresAtMs,
      tokenType: tokenData.token_type,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Redirect to frontend to save Ads + Search Console accounts
  // const redirectUrl = new URL("/en/admin/save-google-tokens", url.origin);
  const redirectUrl = new URL("/en/admin/save-google-tokens", "https://reports.vispansolutions.com");
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
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}
