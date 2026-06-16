"use server";

import { getAnalyticsSession } from "@/lib/analytics-session-server";
import { resolveSwitcherItemsForSession } from "@/lib/switcher-items";
import type { SwitcherItem } from "@/lib/switcher-types";

export async function getSwitcherItems(): Promise<SwitcherItem[]> {
    return resolveSwitcherItemsForSession(await getAnalyticsSession());
}
