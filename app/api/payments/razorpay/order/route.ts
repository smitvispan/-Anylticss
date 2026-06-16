import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Plan from "@/models/Plan";
import User from "@/models/User";
import razorpay from "@/lib/razorpay";
import { calculatePlanBillingPreview, formatBillingAmount } from "@/lib/subscription-billing";

export async function POST(req: Request) {
    try {
        const { planId, userId } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "Plan is required" }, { status: 400 });
        }

        await connectDB();

        const plan = await Plan.findById(planId).lean();
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        const user =
            typeof userId === "string" && /^[a-f0-9]{24}$/i.test(userId)
                ? await User.findById(userId)
                    .select({ activeSubscription: 1 })
                    .populate({
                        path: "activeSubscription",
                        populate: {
                            path: "planId",
                            select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                        },
                    })
                    .lean()
                : null;

        const preview = calculatePlanBillingPreview({
            currentSubscription: (user as any)?.activeSubscription,
            targetPlan: plan,
        });

        if (preview.isCurrentPlan) {
            return NextResponse.json(
                {
                    error: "This plan is already active for the selected user.",
                    preview,
                },
                { status: 400 }
            );
        }

        const amount = preview.payableAmount;

        if (amount <= 0) {
            return NextResponse.json({
                id: null,
                amount: 0,
                currency: "INR",
                zeroPayable: true,
                preview,
                description:
                    preview.creditAmount > 0
                        ? `Unused credit covers the switch to ${plan.name}.`
                        : `No payment required for ${plan.name}.`,
            });
        }

        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                planId: String(plan._id),
                userId: typeof userId === "string" ? userId : "",
                payableAmount: String(amount),
                creditAmount: String(preview.creditAmount),
                planPrice: String(preview.targetPlanPrice),
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            ...order,
            preview,
            description: `Pay ₹${formatBillingAmount(amount)} to activate ${plan.name}`,
        });
    } catch (error: any) {
        console.error("Razorpay order error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create order" },
            { status: 500 }
        );
    }
}
