"use client";

import { useState, useTransition } from "react";

type Plan = {
    _id: any;
    name: string;
    price?: number;
};

type PlanSelectorProps = {
    userId: string;
    currentPlanId: string;
    plans: Plan[];
};

export default function PlanSelector({ userId, currentPlanId, plans }: PlanSelectorProps) {
    const [selected, setSelected] = useState(currentPlanId);
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleChange = async (newPlanId: string) => {
        if (newPlanId === selected) return;
        setStatus("idle");
        startTransition(async () => {
            try {
                const res = await fetch("/api/admin/assign-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, planId: newPlanId }),
                });
                if (!res.ok) throw new Error("Failed");
                setSelected(newPlanId);
                setStatus("success");
                setTimeout(() => setStatus("idle"), 2000);
            } catch {
                setStatus("error");
                setTimeout(() => setStatus("idle"), 2500);
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <select
                value={selected}
                disabled={isPending}
                onChange={(e) => handleChange(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 cursor-pointer"
            >
                {plans.map((p) => (
                    <option key={String(p._id)} value={String(p._id)}>
                        {p.name}{p.price !== undefined ? ` — ₹${p.price}` : ""}
                    </option>
                ))}
            </select>

            {isPending && (
                <span className="text-xs text-slate-400 animate-pulse">Saving…</span>
            )}
            {status === "success" && (
                <span className="text-xs font-semibold text-emerald-600">✓ Updated</span>
            )}
            {status === "error" && (
                <span className="text-xs font-semibold text-red-500">✗ Failed</span>
            )}
        </div>
    );
}
