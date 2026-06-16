"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function PlanSelector({
    userId,
    currentPlanId,
    plans,
}: {
    userId: string;
    currentPlanId: string;
    plans: any[];
}) {
    const [loading, setLoading] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPlanId = e.target.value;
        if (!newPlanId || newPlanId === currentPlanId) return;

        const plan = plans.find(p => String(p._id) === newPlanId);
        if (!plan) return;

        setLoading(true);

        try {
            const res = await fetch("/api/payments/razorpay/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: plan._id,
                    userId,
                }),
            });

            const order = await res.json().catch(() => null);
            if (!res.ok || order?.error) {
                throw new Error(order?.error || "Failed to create Razorpay order");
            }

            if (order?.zeroPayable) {
                const switchRes = await fetch("/api/subscriptions/change-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, planId: newPlanId }),
                });

                const switchData = await switchRes.json().catch(() => null);
                if (!switchRes.ok || !switchData?.success) {
                    throw new Error(switchData?.error || "Failed to update plan");
                }

                toast.success("Plan updated successfully");
                setLoading(false);
                return;
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: "INR",
                name: "Vispan Solutions",
                description: order.description || `Plan: ${plan.name}`,
                order_id: order.id,
                handler: async function (response: any) {
                    let success = false;
                    try {
                        const verifyRes = await fetch("/api/payments/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(response),
                        });

                        const verifyData = await verifyRes.json().catch(() => null);
                        if (!verifyRes.ok || !verifyData?.success) {
                            throw new Error(verifyData?.error || verifyData?.message || "Failed to update plan");
                        }

                        toast.success("Plan updated successfully");
                        success = true;
                    } catch (err: any) {
                        toast.error(err.message || "Failed to update plan");
                    } finally {
                        setLoading(false);
                        if (success) {
                            window.location.reload();
                        }
                    }
                },
                prefill: {
                    name: "Admin Update",
                    contact: "9999999999"
                },
                theme: { color: "#0284c7" },
                modal: {
                    ondismiss: () => setLoading(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            toast.error(err.message || "Failed to update plan");
            setLoading(false);
        }
    };

    return (
        <select
            value={currentPlanId}
            onChange={handleChange}
            disabled={loading}
            className="bg-sky-50 border-none px-2 py-0.5 rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-sky-400 outline-none cursor-pointer disabled:opacity-50"
        >
            <option value="" disabled>Select Plan</option>
            {plans.map((p) => (
                <option key={p._id} value={p._id}>
                    {p.name}
                </option>
            ))}
        </select>
    );
}
