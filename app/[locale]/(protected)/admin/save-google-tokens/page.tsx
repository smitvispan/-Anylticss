"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SaveGoogleTokens() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!params) return;

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const scope = params.get("scope");
    const expiresAt = params.get("expiresAt");
    const googleId = params.get("googleId");
    const email = params.get("email");
    const name = params.get("name");
    const profilePic = params.get("profilePic");

    if (accessToken) {
      fetch("/api/google/save-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          refreshToken,
          scope,
          expiresAt,
          googleId,
          email,
          name,
          profilePic,
        }),
      })
        .catch((err) => {
          console.error("Failed to sync Google data", err);
        })
        .finally(() => {
          router.push("/en/admin"); // go back
        });
    }
  }, [params, router]);

  return <p>Saving Google tokens…</p>;
}
