import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Plan from "@/models/Plan";
import {
  activateSubscriptionForUser,
  calculatePlanBillingPreview,
} from "@/lib/subscription-billing";
import { getAnalyticsSessionFromCookieGetter } from "@/lib/analytics-session";
import {
  encodeClientSessionToken,
  getClientSessionCookieOptions,
  getPreferredClientSessionCookieName,
} from "@/lib/client-auth";

async function getViewerSession() {
  const cookieStore = await cookies();
  return getAnalyticsSessionFromCookieGetter((cookieName) => cookieStore.get(cookieName)?.value);
}

export async function POST(req: Request) {
  try {
    const session = await getViewerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const planId = typeof body?.planId === "string" ? body.planId : "";

    if (!userId || !planId) {
      return NextResponse.json({ error: "User and plan are required" }, { status: 400 });
    }

    if (session.user.role !== "admin" && session.user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(userId)
      .select({ _id: 1, name: 1, email: 1, role: 1, activeSubscription: 1 })
      .populate({
        path: "activeSubscription",
        populate: {
          path: "planId",
          select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
        },
      })
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const preview = calculatePlanBillingPreview({
      currentSubscription: (user as any)?.activeSubscription,
      targetPlan: plan,
    });

    if (preview.isCurrentPlan) {
      return NextResponse.json({ error: "This plan is already active." }, { status: 400 });
    }

    if (preview.payableAmount > 0) {
      return NextResponse.json(
        { error: "Payment is required before activating this plan.", preview },
        { status: 400 }
      );
    }

    await activateSubscriptionForUser({
      userId: String(user._id),
      plan,
      currentSubscription: (user as any)?.activeSubscription,
      amountPaid: 0,
      creditApplied: preview.creditAmount,
    });

    const response = NextResponse.json({
      success: true,
      message: "Plan switched successfully.",
      preview,
    });

    if (session.user.id === String(user._id) && (user.role === "client" || user.role === "user")) {
      const token = await encodeClientSessionToken({
        id: String(user._id),
        name: user.name ?? null,
        email: user.email ?? null,
        image: null,
        role: user.role,
        canResell: Boolean(plan.canResell),
        planName: plan.name || "No Active Plan",
      });

      response.cookies.set(
        getPreferredClientSessionCookieName(user.role),
        token,
        getClientSessionCookieOptions(true)
      );
    }

    return response;
  } catch (error: any) {
    console.error("[change-plan]", error);
    return NextResponse.json(
      { error: error.message || "Failed to change plan" },
      { status: 500 }
    );
  }
}
