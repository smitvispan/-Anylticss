"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SaveGoogleTokens() {
  const routeParams = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!searchParams) return;

    const locale = typeof routeParams?.locale === "string" ? routeParams.locale : "en";

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const scope = searchParams.get("scope");
    const expiresAt = searchParams.get("expiresAt");
    const googleId = searchParams.get("googleId");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const profilePic = searchParams.get("profilePic");
    const ownerId = searchParams.get("ownerId");

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
          ownerId,
        }),
      })
        .catch((err) => {
          console.error("Failed to sync Google data", err);
        })
        .finally(() => {
          router.push(`/${locale}/admin`);
        });
    }
  }, [routeParams, router, searchParams]);

  return <p>Saving Google tokens…</p>;
}
