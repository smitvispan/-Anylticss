import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { activateSubscriptionForUser } from "@/lib/subscription-billing";
import User from "@/models/User";
import Plan from "@/models/Plan";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || ((session.user as any).role !== "admin" && !(session.user as any).isAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, planId } = await req.json();

        if (!userId || !planId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Verify the user and plan exist
        const [user, plan] = await Promise.all([
            User.findById(userId)
                .select({ _id: 1, activeSubscription: 1 })
                .populate({
                    path: "activeSubscription",
                    populate: {
                        path: "planId",
                        select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
                    },
                })
                .lean(),
            Plan.findById(planId).lean(),
        ]);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        await activateSubscriptionForUser({
            userId,
            plan,
            currentSubscription: (user as any).activeSubscription,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Assign Plan API] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
