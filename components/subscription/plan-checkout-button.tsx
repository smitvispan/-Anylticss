"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";

type PlanCheckoutButtonProps = {
  clientId: string;
  preview: {
    isCurrentPlan: boolean;
    payableAmount: number;
    creditAmount: number;
    currentPlanName?: string | null;
  };
  plan: {
    _id: string;
    name: string;
    price: number;
  };
};

export default function PlanCheckoutButton({
  clientId,
  preview,
  plan,
}: PlanCheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const formattedPayable = preview.payableAmount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(preview.payableAmount) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  const handleCheckout = async () => {
    if (loading || preview.isCurrentPlan) return;

    if (preview.payableAmount <= 0) {
      setLoading(true);
      try {
        const switchRes = await fetch("/api/subscriptions/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: clientId,
            planId: plan._id,
          }),
        });

        const payload = await switchRes.json().catch(() => null);
        if (!switchRes.ok || !payload?.success) {
          throw new Error(payload?.error || "Unable to switch plan");
        }

        toast.success("Plan switched successfully.");
        router.refresh();
      } catch (error: any) {
        toast.error(error.message || "Unable to switch plan");
      } finally {
        setLoading(false);
      }
      return;
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey || razorpayKey === "rzp_test_placeholder") {
      toast.error("Razorpay public key is missing.");
      return;
    }

    if (!(window as any).Razorpay) {
      toast.error("Razorpay checkout is still loading. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan._id,
          userId: clientId,
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok || order.error) {
        throw new Error(order.error || "Failed to create Razorpay order");
      }

      if (order.zeroPayable) {
        const switchRes = await fetch("/api/subscriptions/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: clientId,
            planId: plan._id,
          }),
        });

        const payload = await switchRes.json().catch(() => null);
        if (!switchRes.ok || !payload?.success) {
          throw new Error(payload?.error || "Unable to switch plan");
        }

        toast.success("Plan switched successfully.");
        router.refresh();
        setLoading(false);
        return;
      }

      if (!order.id) {
        throw new Error("Failed to create Razorpay order");
      }

      const rzp = new (window as any).Razorpay({
        key: razorpayKey,
        amount: order.amount,
        currency: "INR",
        name: "Vispan Solutions",
        description: order.description || `Upgrade to ${plan.name}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || verifyData.error || "Payment verification failed");
            }

            toast.success("Plan upgraded successfully.");
            router.refresh();
          } catch (error: any) {
            toast.error(error.message || "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Unable to start Razorpay checkout");
      setLoading(false);
    }
  };

  const disabled = loading || preview.isCurrentPlan;
  const label = preview.isCurrentPlan
    ? "Current Plan"
    : loading
      ? preview.payableAmount > 0
        ? "Opening Razorpay..."
        : "Switching..."
      : preview.payableAmount > 0
        ? `Upgrade & Pay ₹${formattedPayable}`
        : "Switch Now";

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold shadow-sm transition-all ${
        preview.isCurrentPlan
          ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-900 bg-transparent text-slate-900 group-hover:bg-slate-900 group-hover:text-white"
      } ${loading ? "cursor-wait opacity-70" : ""}`}
    >
      {loading ? (
        <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
      ) : (
        <Icon
          icon={preview.isCurrentPlan ? "lucide:check" : "lucide:arrow-right"}
          className="h-4 w-4"
        />
      )}
      {label}
    </button>
  );
}
