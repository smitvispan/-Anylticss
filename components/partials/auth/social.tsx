"use client";
import { useSession } from "next-auth/react";

export default function Social({
  locale,
  ownerId,
}: {
  locale: string;
  ownerId?: string | null;
}) {
  const { data: session } = useSession();
  const resolvedOwnerId = ownerId || session?.user?.id || "";
  const facebookHref = resolvedOwnerId
    ? `/api/facebook/connect?adminId=${encodeURIComponent(resolvedOwnerId)}&locale=${encodeURIComponent(locale || "en")}`
    : "#";
  const googleHref = resolvedOwnerId
    ? `/api/google/connect?adminId=${encodeURIComponent(resolvedOwnerId)}&locale=${encodeURIComponent(locale || "en")}`
    : "#";

  return (
    <div className="flex items-center space-x-3">
      <a
        href={facebookHref}
        aria-disabled={!resolvedOwnerId}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium duration-300 hover:ring-2 hover:ring-offset-2 ring-offset-background transition-all focus-visible:outline-hidden focus-visible:hidden focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-default text-default-foreground hover:bg-default/90 hover:ring-default dark:disabled:bg-default-500 w-full h-11 md:px-6 px-4"
      >
        Connect Facebook
      </a>

      {/* <button
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium duration-300 hover:ring-2 hover:ring-offset-2 ring-offset-background transition-all focus-visible:outline-hidden focus-visible:hidden focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-default text-default-foreground hover:bg-default/90 hover:ring-default dark:disabled:bg-default-500 w-full h-11 md:px-6 px-4"
        onClick={() =>
          signIn("google_connect", {
            callbackUrl: `/${locale}/admin`, // ✅ correct final URL
          })
        }
      >
        Connect Google Ads / GSC
      </button> */}
      <a
        href={googleHref}
        aria-disabled={!resolvedOwnerId}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium duration-300 hover:ring-2 hover:ring-offset-2 ring-offset-background transition-all focus-visible:outline-hidden focus-visible:hidden focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-default text-default-foreground hover:bg-default/90 hover:ring-default dark:disabled:bg-default-500 w-full h-11 md:px-6 px-4"
      >
        Connect Google Ads & GSC
      </a>

    </div>
  );
}
