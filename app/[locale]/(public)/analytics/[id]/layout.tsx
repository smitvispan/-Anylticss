import type { ReactNode } from "react";
import Script from "next/script";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { WorkspaceProvider } from "@/providers/workspace.provider";

export default async function AnalyticsUserLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getAnalyticsSession();

  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/analytics/${id}`)}`);
  }

  await connectDB();
  const targetUser = await User.findById(id)
    .select({
      _id: 1,
      name: 1,
      role: 1,
      parent_client_id: 1,
      activeSubscription: 1,
      mainPage: 1,
      mainInstagram: 1,
      mainAd: 1,
      mainGoogleAd: 1,
      mainSEOsites: 1,
      connectAll: 1,
    })
    .populate({
      path: "activeSubscription",
      populate: { path: "planId" }
    })
    .lean();

  if (!targetUser) {
    redirect(`/${locale}`);
  }

  let authorized = false;
  const viewerRole = session.user.role;
  const viewerIsOwner = session.user.id === id;

  if (viewerRole === "admin" || viewerIsOwner) {
    authorized = true;
  } else if (viewerRole === "client") {
    if (String(targetUser.parent_client_id) === session.user.id) {
      authorized = true;
    }
  }

  if (!authorized) {
    redirect(`/${locale}`);
  }

  const isTeamUser = targetUser.role === "user";
  const parentClient = isTeamUser && targetUser.parent_client_id
    ? await User.findById(targetUser.parent_client_id)
        .select({ _id: 1, name: 1, activeSubscription: 1 })
        .populate({
          path: "activeSubscription",
          populate: { path: "planId" }
        })
        .lean()
    : null;

  const subscription = isTeamUser
    ? ((parentClient as any)?.activeSubscription || null)
    : ((targetUser as any)?.activeSubscription || null);
  const workspaceName = isTeamUser
    ? parentClient?.name || targetUser.name || "User Workspace"
    : targetUser.name || "User Workspace";

  // Check Subscription Expiry
  if (subscription) {
    const now = new Date();
    const expiry = new Date(subscription.endDate);
    if (expiry < now) {
      redirect(`/${locale}?error=plan_expired`);
    }
  }

  const hasNoPlan = !subscription;
  const viewerIsClient = viewerRole === "client";
  const viewerIsAdmin = viewerRole === "admin";
  const clientId = String(targetUser.parent_client_id ?? "");

  if (isTeamUser && hasNoPlan) {
    // Client or Admin viewing → show upgrade prompt
    if (viewerIsClient || viewerIsAdmin) {
      return (
        <WorkspaceProvider workspace={{
          id: String(targetUser._id),
          name: workspaceName,
          role: targetUser.role || "user",
          planName: "No Active Plan",
          canResell: false
        }}>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-10 text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">No Active Plan</h2>
              <p className="text-slate-500 mb-2 leading-relaxed">
                <strong className="text-slate-700">{parentClient?.name || targetUser.name}</strong> does not have an active subscription plan assigned.
              </p>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                Activate a plan on the client workspace to grant this user access to assigned reports.
              </p>
              <div className="flex flex-col gap-3">
                {viewerIsClient && (
                  <a
                    href={`/${locale}/analytics/${clientId}/plans`}
                    className="inline-flex items-center justify-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-sky-100 hover:bg-sky-700 transition"
                  >
                    Open Client Plans
                  </a>
                )}
                {viewerIsAdmin && (
                  <a
                    href={`/${locale}/admin/plans`}
                    className="inline-flex items-center justify-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-sky-100 hover:bg-sky-700 transition"
                  >
                    Open Billing Plans
                  </a>
                )}
                <a
                  href={viewerIsClient ? `/${locale}/analytics/${clientId}/users` : `/${locale}/admin`}
                  className="text-slate-500 font-semibold hover:text-slate-700 text-sm transition"
                >
                  ← Back to Team
                </a>
              </div>
            </div>
          </div>
        </WorkspaceProvider>
      );
    }

    // The user themselves viewing → block with "contact admin" message
    return (
      <WorkspaceProvider workspace={{
        id: String(targetUser._id),
        name: workspaceName,
        role: targetUser.role || "user",
        planName: "No Active Plan",
        canResell: false,
        assignments: {
          mainPage: targetUser.mainPage?.toString(),
          mainInstagram: targetUser.mainInstagram?.toString(),
          mainAd: targetUser.mainAd?.toString(),
          mainGoogleAd: targetUser.mainGoogleAd?.toString(),
          mainSEOsites: targetUser.mainSEOsites?.toString(),
          connectAll: (targetUser as any).connectAll ?? false,
        }
      }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-10 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Active Plan</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Your client workspace does not have an active subscription plan. Please contact your administrator.
            </p>
            <a
              href={`/${locale}/login`}
              className="text-slate-500 font-semibold hover:text-slate-700 text-sm transition"
            >
              ← Back to Login
            </a>
          </div>
        </div>
      </WorkspaceProvider>
    );
  }

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <WorkspaceProvider workspace={{
        id: String(targetUser._id),
        name: workspaceName,
        role: targetUser.role || "user",
        planName: subscription?.planId?.name || "No Active Plan",
        canResell: subscription?.planId?.canResell || false,
        assignments: {
          mainPage: targetUser.mainPage?.toString(),
          mainInstagram: targetUser.mainInstagram?.toString(),
          mainAd: targetUser.mainAd?.toString(),
          mainGoogleAd: targetUser.mainGoogleAd?.toString(),
          mainSEOsites: targetUser.mainSEOsites?.toString(),
          connectAll: (targetUser as any).connectAll ?? false,
        }
      }}>
        {children}
      </WorkspaceProvider>
    </>
  );
}
