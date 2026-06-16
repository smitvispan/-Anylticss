"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Script from "next/script";
import { PLAN_CATALOG, getPlanDisplayName, isCustomPlanTier } from "@/lib/plan-catalog";
import CustomPlanRequestButton from "@/components/subscription/custom-plan-request-button";

interface PricingPlan {
    _id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
    isPopular?: boolean;
}

export default function PricingModal({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const id = params?.id as string; // This is the client/parent ID
    const [loading, setLoading] = useState<string | null>(null);

    const plans: PricingPlan[] = PLAN_CATALOG.map((plan) => ({
        _id: plan._id,
        name: plan.name,
        price: plan.price,
        description: plan.description,
        features: plan.featureBullets,
        isPopular: plan._id === PLAN_CATALOG[1]?._id,
    }));

    const handleCheckout = async (plan: PricingPlan) => {
        if (plan.price === 0 || isCustomPlanTier(plan)) {
            toast.info("This is a free plan.");
            return;
        }

        setLoading(plan.name);
        try {
            // 1. Create Order
            const res = await fetch("/api/payments/razorpay/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: plan.price,
                    planId: plan._id,
                    userId: id
                }),
            });

            const order = await res.json();
            console.log("Razorpay Order Response:", order);

            if (order.error || !order.id) {
                const errMsg = order.error?.description || order.error || "Failed to generate Order ID";
                toast.error(`Order Error: ${errMsg}`);
                return;
            }

            const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
            if (!razorpayKey || razorpayKey === "rzp_test_placeholder") {
                console.error("CRITICAL: NEXT_PUBLIC_RAZORPAY_KEY_ID is missing or set to placeholder!");
                toast.error("Payment Configuration Error: Missing Public Key");
                return;
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: razorpayKey,
                amount: order.amount,
                currency: "INR",
                name: "Vispan Analytics",
                description: `Upgrade to ${plan.name} Plan`,
                order_id: order.id,
                handler: async function (response: any) {
                    console.log("Razorpay Success Response:", response);
                    // 3. Verify Payment
                    const verifyRes = await fetch("/api/payments/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...response,
                            planId: plan._id,
                            userId: id
                        }),
                    });

                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        toast.success("Subscription upgraded successfully!");
                        window.location.reload();
                    } else {
                        toast.error(verifyData.message || "Verification failed");
                    }
                },
                prefill: {
                    name: "Test User",
                    email: "test@demo.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#0284c7",
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Checkout failed");
        } finally {
            setLoading(null);
        }
    };

    return (
        <>
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
            />
            <Dialog>
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
                <DialogContent size="md" className="max-w-4xl p-0 overflow-hidden bg-slate-50 border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-white border-b border-slate-100">
                        <DialogTitle className="text-3xl font-extrabold text-slate-900 tracking-tight">Upgrade Your Plan</DialogTitle>
                        <p className="text-slate-500 mt-2">Choose the best plan to power your marketing data and team collaboration.</p>
                    </DialogHeader>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div key={plan.name} className={`relative flex flex-col bg-white rounded-3xl p-6 shadow-sm border ${plan.isPopular ? 'border-sky-500 ring-4 ring-sky-50' : 'border-slate-200'}`}>
                                {plan.isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-[10px] font-bold uppercase py-1 px-3 rounded-full flex items-center gap-1">
                                        <Icon icon="lucide:star" className="w-3 h-3 fill-current" />
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">{getPlanDisplayName(plan)}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-slate-900">
                                            {isCustomPlanTier(plan) ? getPlanDisplayName(plan) : `₹${plan.price}`}
                                        </span>
                                        {!isCustomPlanTier(plan) && (
                                            <span className="text-slate-500 font-medium whitespace-nowrap">/ month</span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 text-xs mt-3 leading-relaxed">{plan.description}</p>
                                </div>

                                <div className="flex-1 space-y-3 mb-8">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2">
                                            <div className="mt-1 bg-sky-100 rounded-full p-0.5">
                                                <Icon icon="lucide:check" className="w-3 h-3 text-sky-600 font-bold" />
                                            </div>
                                            <span className="text-sm text-slate-600">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {isCustomPlanTier(plan) ? (
                                    <CustomPlanRequestButton
                                        planName={getPlanDisplayName(plan)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    />
                                ) : (
                                    <button
                                        onClick={() => handleCheckout(plan)}
                                        disabled={loading !== null}
                                        className={
                                            `w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${plan.isPopular
                                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-100 hover:bg-sky-700'
                                                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                            } ${loading === plan.name ? 'opacity-50 cursor-not-allowed' : ''}`
                                        }>
                                        {loading === plan.name && <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />}
                                        {`Select ${getPlanDisplayName(plan)}`}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-slate-100 text-center">
                        <p className="text-xs text-slate-500">
                            Payments are secure & encrypted. Needs help? <button className="text-sky-600 font-bold hover:underline">Contact our support team</button>
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
