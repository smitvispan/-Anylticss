import { NextRequest, NextResponse } from "next/server";

function getIsHttps(request: NextRequest) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const isHttps = getIsHttps(request);
  const cookieNames = isHttps
    ? ["__Secure-next-auth.session-token", "next-auth.session-token"]
    : ["next-auth.session-token"];

  for (const cookieName of cookieNames) {
    const token = request.cookies.get(cookieName)?.value;
    if (!token) continue;

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
