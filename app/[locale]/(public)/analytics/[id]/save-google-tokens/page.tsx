"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AnalyticsSaveGoogleTokensPage() {
  const params = useParams<{ locale: string; id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function syncTokens() {
      if (!searchParams) return;

      const locale = typeof params?.locale === "string" ? params.locale : "en";
      const id = typeof params?.id === "string" ? params.id : "";

      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const scope = searchParams.get("scope");
      const expiresAt = searchParams.get("expiresAt");
      const googleId = searchParams.get("googleId");
      const email = searchParams.get("email");
      const name = searchParams.get("name");
      const profilePic = searchParams.get("profilePic");
      const ownerId = searchParams.get("ownerId");

      const redirectPath = id
        ? `/${locale}/analytics/${id}/connections`
        : `/${locale}`;

      if (!accessToken || !refreshToken) {
        router.replace(redirectPath);
        return;
      }

      try {
        await fetch("/api/google/save-tokens", {
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
        });
      } catch (error) {
        console.error("Failed to sync Google data", error);
      } finally {
        if (!cancelled) {
          router.replace(redirectPath);
        }
      }
    }

    syncTokens();

    return () => {
      cancelled = true;
    };
  }, [params, router, searchParams]);

  return <p>Syncing Google accounts…</p>;
}
