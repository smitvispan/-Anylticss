import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import User from "@/models/User";
import PendingSignup from "@/models/PendingSignup";
import razorpay from "@/lib/razorpay";
import {
  activateSubscriptionForUser,
  formatBillingAmount,
} from "@/lib/subscription-billing";
import { resolveClientIdentifiers } from "@/lib/client-identifiers";
import {
  encodeClientSessionToken,
  getClientSessionCookieOptions,
  getPreferredClientSessionCookieName,
} from "@/lib/client-auth";
import { isCustomPlanTier } from "@/lib/plan-catalog";
import { provisionDemoWorkspaceForUser } from "@/lib/provision-demo-workspace";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const planId = asText(body?.planId);
    const agencyName = asText(body?.agencyName);
    const website = asText(body?.website) || null;
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    const demoMode = body?.demoMode === true || body?.demoMode === "true";

    if (!planId || !agencyName || !email || !password) {
      return NextResponse.json(
        { error: "Agency name, email, password, and plan are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({
      email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isAdmin: false,
    })
      .select({ _id: 1 })
      .lean();

    if (existingUser?._id) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in first." },
        { status: 409 }
      );
    }

    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    if (isCustomPlanTier(plan)) {
      return NextResponse.json(
        { error: "Custom plans require a manual request." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const pendingSignup = await PendingSignup.create({
      agencyName,
      website,
      email,
      passwordHash: hashedPassword,
      planId: plan._id,
      status: "pending",
    });

    const amount = Number(plan.price || 0);

    if (amount <= 0) {
      const identifiers = await resolveClientIdentifiers({ isAdmin: false });
      const user = await User.create({
        name: agencyName,
        agencyWebsite: website,
        email,
        password: hashedPassword,
        role: "client",
        isAdmin: false,
        ...identifiers,
      });

      await activateSubscriptionForUser({
        userId: String(user._id),
        plan,
        amountPaid: 0,
        creditApplied: 0,
      });

      if (demoMode) {
        void provisionDemoWorkspaceForUser({
          userId: String(user._id),
          planName: String(plan.name || ""),
        }).catch((provisionError) => {
          console.error("[public-signup-order] demo provisioning failed:", provisionError);
        });
      }

      await PendingSignup.findByIdAndUpdate(pendingSignup._id, {
        status: "completed",
        userId: user._id,
      }).catch(() => null);

      const token = await encodeClientSessionToken({
        id: String(user._id),
        name: user.name ?? null,
        email: user.email ?? null,
        image: null,
        role: "client",
        canResell: Boolean(plan.canResell),
        planName: plan.name || "No Active Plan",
      });

      const response = NextResponse.json({
        success: true,
        directActivate: true,
        userId: String(user._id),
      });

      response.cookies.set(
        getPreferredClientSessionCookieName("client"),
        token,
        getClientSessionCookieOptions(true)
      );

      return response;
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `public_signup_${Date.now()}`,
      notes: {
        planId: String(plan._id),
        pendingSignupId: String(pendingSignup._id),
        signupFlow: "public",
        demoMode: demoMode ? "true" : "false",
      },
    });

    await PendingSignup.findByIdAndUpdate(pendingSignup._id, {
      orderId: order.id,
    }).catch(() => null);

    return NextResponse.json({
      ...order,
      description: `Pay ₹${formatBillingAmount(amount)} to activate ${plan.name}`,
    });
  } catch (error: any) {
    console.error("[public-signup-order]", error);
    return NextResponse.json(
      { error: error.message || "Unable to start registration checkout." },
      { status: 500 }
    );
  }
}
