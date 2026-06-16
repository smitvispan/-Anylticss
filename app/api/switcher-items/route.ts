import { NextResponse } from "next/server";
import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { resolveSwitcherItemsForSession } from "@/lib/switcher-items";

export async function GET() {
  try {
    const items = await resolveSwitcherItemsForSession(await getAnalyticsSession());
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[switcher-items]", error);
    return NextResponse.json({ error: "Unable to load switcher items." }, { status: 500 });
  }
}
