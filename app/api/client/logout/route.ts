import { NextResponse } from "next/server";
import { getClientSessionCookieNames } from "@/lib/client-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  for (const cookieName of getClientSessionCookieNames()) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
