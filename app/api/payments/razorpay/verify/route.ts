import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Plan from "@/models/Plan";
import PendingSignup from "@/models/PendingSignup";
import razorpay from "@/lib/razorpay";
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
import { resolveClientIdentifiers } from "@/lib/client-identifiers";
import { provisionDemoWorkspaceForUser } from "@/lib/provision-demo-workspace";

async function syncClientSessionForViewer(response: NextResponse, userId: string, plan: any, forceSignIn = false) {
    const cookieStore = await cookies();
    const session = await getAnalyticsSessionFromCookieGetter((cookieName) =>
        cookieStore.get(cookieName)?.value
    );

    if (!forceSignIn && (!session?.user?.id || session.user.id !== userId)) {
        return;
    }

    if (!forceSignIn && session?.user?.role !== "client" && session?.user?.role !== "user") {
        return;
    }

    const user = await User.findById(userId).select({ _id: 1, name: 1, email: 1, role: 1 }).lean();
    if (!user || (user.role !== "client" && user.role !== "user")) {
        return;
    }

    const token = await encodeClientSessionToken({
        id: String(user._id),
        name: user.name ?? null,
        email: user.email ?? null,
        image: null,
        role: user.role,
        canResell: Boolean(plan?.canResell),
        planName: plan?.name || "No Active Plan",
    });

    response.cookies.set(
        getPreferredClientSessionCookieName(user.role),
        token,
        getClientSessionCookieOptions(true)
    );
}

export async function POST(req: Request) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: "Incomplete payment payload" }, { status: 400 });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret")
            .update(body.toString())
            .digest("hex");

        const isMatch = expectedSignature === razorpay_signature;

        if (!isMatch) {
            return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
        }

        await connectDB();

        const order = await razorpay.orders.fetch(razorpay_order_id);
        const resolvedPlanId =
            typeof order.notes?.planId === "string" ? order.notes.planId : String(order.notes?.planId || "");
        const resolvedUserId =
            typeof order.notes?.userId === "string" ? order.notes.userId : String(order.notes?.userId || "");
        const pendingSignupId =
            typeof order.notes?.pendingSignupId === "string"
                ? order.notes.pendingSignupId
                : String(order.notes?.pendingSignupId || "");
        const signupFlow = typeof order.notes?.signupFlow === "string" ? order.notes.signupFlow : "";
        const demoMode =
            typeof order.notes?.demoMode === "string"
                ? order.notes.demoMode === "true"
                : Boolean(order.notes?.demoMode);

        if (!resolvedPlanId || (!resolvedUserId && !pendingSignupId)) {
            return NextResponse.json({ error: "Order is missing billing context" }, { status: 400 });
        }

        const plan = await Plan.findById(resolvedPlanId).lean();
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        let user: any = null;
        let forceSignIn = signupFlow === "public";

        if (resolvedUserId && /^[a-f0-9]{24}$/i.test(resolvedUserId)) {
            user = await User.findById(resolvedUserId)
                .select({ _id: 1, activeSubscription: 1, name: 1, email: 1, role: 1 })
                .populate({
                    path: "activeSubscription",
                    populate: {
                        path: "planId",
                        select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                    },
                })
                .lean();
        } else if (pendingSignupId && /^[a-f0-9]{24}$/i.test(pendingSignupId)) {
            const pendingSignup = await PendingSignup.findById(pendingSignupId)
                .select({ _id: 1, agencyName: 1, website: 1, email: 1, passwordHash: 1, userId: 1, status: 1 })
                .lean();

            if (!pendingSignup) {
                return NextResponse.json({ error: "Pending registration not found" }, { status: 404 });
            }

            if (pendingSignup.userId) {
                user = await User.findById(pendingSignup.userId)
                    .select({ _id: 1, activeSubscription: 1, name: 1, email: 1, role: 1 })
                    .populate({
                        path: "activeSubscription",
                        populate: {
                            path: "planId",
                            select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                        },
                    })
                    .lean();
            }

            if (!user) {
                const existingUser = await User.findOne({
                    email: new RegExp(`^${String(pendingSignup.email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                    isAdmin: false,
                })
                    .select({ _id: 1, activeSubscription: 1, name: 1, email: 1, role: 1 })
                    .populate({
                        path: "activeSubscription",
                        populate: {
                            path: "planId",
                            select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                        },
                    })
                    .lean();

                if (existingUser) {
                    user = existingUser;
                } else {
                    const identifiers = await resolveClientIdentifiers({ isAdmin: false });
                    const createdUser = await User.create({
                        name: pendingSignup.agencyName,
                        agencyWebsite: pendingSignup.website || null,
                        email: pendingSignup.email,
                        password: pendingSignup.passwordHash,
                        role: "client",
                        isAdmin: false,
                        ...identifiers,
                    });

                    user = await User.findById(createdUser._id)
                        .select({ _id: 1, activeSubscription: 1, name: 1, email: 1, role: 1 })
                        .populate({
                            path: "activeSubscription",
                            populate: {
                                path: "planId",
                                select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                            },
                        })
                        .lean();
                }
            }

            await PendingSignup.findByIdAndUpdate(pendingSignupId, {
                status: "completed",
                userId: user?._id || null,
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
            }).catch(() => null);
        }

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const preview = calculatePlanBillingPreview({
            currentSubscription: (user as any)?.activeSubscription,
            targetPlan: plan,
        });

        const paidAmount = Number(order.amount || 0) / 100;
        const expectedAmount = preview.payableAmount;

        if (Math.abs(paidAmount - expectedAmount) > 0.01) {
            return NextResponse.json(
                {
                    error: `Paid amount mismatch. Expected ₹${expectedAmount}, received ₹${paidAmount}.`,
                },
                { status: 400 }
            );
        }

        await activateSubscriptionForUser({
            userId: String(user._id),
            plan,
            currentSubscription: (user as any)?.activeSubscription,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amountPaid: paidAmount,
            creditApplied: preview.creditAmount,
        });

        if (demoMode) {
            void provisionDemoWorkspaceForUser({
                userId: String(user._id),
                planName: String(plan.name || ""),
            }).catch((provisionError) => {
                console.error("[razorpay-verify] demo provisioning failed:", provisionError);
            });
        }

        const response = NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            preview,
            userId: String(user._id),
        });

        await syncClientSessionForViewer(response, String(user._id), plan, forceSignIn);
        return response;
    } catch (error: any) {
        console.error("Razorpay verification error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to verify payment" },
            { status: 500 }
        );
    }
}
