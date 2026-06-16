"use client";
import { useSession } from "next-auth/react";

export default function Social({ locale }: { locale: string }) {
  const { data: session } = useSession();
  const adminId = session?.user?.id;
  const facebookHref = adminId
    ? `/api/facebook/connect?adminId=${encodeURIComponent(adminId)}`
    : "#";

  return (
    <div className="flex items-center space-x-3">
      <a
        href={facebookHref}
        aria-disabled={!adminId}
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
        href={`/api/google/connect?adminId=${session?.user?.id}`}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium duration-300 hover:ring-2 hover:ring-offset-2 ring-offset-background transition-all focus-visible:outline-hidden focus-visible:hidden focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-default text-default-foreground hover:bg-default/90 hover:ring-default dark:disabled:bg-default-500 w-full h-11 md:px-6 px-4"
      >
        Connect Google Ads & GSC
      </a>

    </div>
  );
}
