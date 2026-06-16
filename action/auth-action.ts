"use server";

import { signIn } from "next-auth/react";

type LoginPayload = { email: string; password: string };

export async function loginUser({ email, password }: LoginPayload) {
  // Use NextAuth signIn with credentials. `redirect: false` so we decide routing.
  const res = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  // NextAuth returns { ok?: boolean; error?: string | null; status: number; url?: string }
  if (!res) {
    return { error: "Unknown error" };
  }
  if (res.error) {
    // “CredentialsSignin” is the usual code when authorize() returns null
    return { error: res.error };
  }
  return { ok: true };
}
