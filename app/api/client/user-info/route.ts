import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        await connectDB();
        // Register models for populate
        const _force = [Subscription, Plan];

        const user = await User.findById(id)
            .select({ name: 1, email: 1, role: 1, activeSubscription: 1 })
            .populate({
                path: 'activeSubscription',
                populate: { path: 'planId' }
            })
            .lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const plan = (user as any)?.activeSubscription?.planId;

        return NextResponse.json({
            name: user.name,
            email: user.email,
            role: user.role,
            planName: plan?.name || "No Active Plan",
            canResell: plan?.canResell || false
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Error fetching user" }, { status: 500 });
    }
}
