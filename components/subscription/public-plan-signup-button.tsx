"use client";

import { useState } from "react";
import Script from "next/script";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type PublicPlanSignupButtonProps = {
  locale: string;
  plan: {
    _id: string;
    name: string;
    price: number;
  };
  defaultAgencyName?: string;
  defaultWebsite?: string;
  defaultEmail?: string;
  demoMode?: boolean;
  className?: string;
};

export default function PublicPlanSignupButton({
  locale,
  plan,
  defaultAgencyName = "",
  defaultWebsite = "",
  defaultEmail = "",
  demoMode = false,
  className = "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800",
}: PublicPlanSignupButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    agencyName: defaultAgencyName,
    website: defaultWebsite,
    email: defaultEmail,
    password: "",
    confirmPassword: "",
  });

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

  async function handleCheckout() {
    if (submitting) return;

    if (!form.agencyName.trim() || !form.email.trim() || !form.password) {
      toast.error("Agency name, email, and password are required.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const orderRes = await fetch("/api/subscriptions/public-signup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan._id,
          agencyName: form.agencyName,
          website: form.website,
          email: form.email,
          password: form.password,
          demoMode,
        }),
      });

      const order = await orderRes.json().catch(() => null);
      if (!orderRes.ok) {
        throw new Error(order?.error || "Unable to create registration order.");
      }

      if (order?.directActivate && order?.userId) {
        toast.success("Account created successfully.");
        window.location.assign(`/${locale}/analytics/${order.userId}/connections`);
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey || razorpayKey === "rzp_test_placeholder") {
        throw new Error("Razorpay public key is missing.");
      }

      if (!(window as any).Razorpay) {
        throw new Error("Razorpay checkout is still loading. Please try again.");
      }

      const rzp = new (window as any).Razorpay({
        key: razorpayKey,
        amount: order.amount,
        currency: "INR",
        name: "Digital Marketing Dashboard",
        description: order.description || `Activate ${plan.name}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok || !verifyData?.success || !verifyData?.userId) {
              throw new Error(verifyData?.message || verifyData?.error || "Payment verification failed.");
            }

            toast.success("Account created and plan activated.");
            setOpen(false);
            window.location.assign(`/${locale}/analytics/${verifyData.userId}/connections`);
          } catch (error: any) {
            toast.error(error.message || "Payment verification failed.");
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          name: form.agencyName,
          email: form.email,
        },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });

      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Unable to start checkout.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script id="public-razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className={className}>
            <Icon icon="lucide:briefcase-business" className="h-4 w-4" />
            Choose {plan.name}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Register Your Agency
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Create your agency workspace for <strong>{plan.name}</strong>, complete payment, and start managing reports and users.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className={labelClass} htmlFor="public-agency-name">Agency Name</label>
              <input
                id="public-agency-name"
                value={form.agencyName}
                onChange={(e) => setForm((current) => ({ ...current, agencyName: e.target.value }))}
                className={inputClass}
                placeholder="Main Agency Name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass} htmlFor="public-website">Primary Website</label>
              <input
                id="public-website"
                value={form.website}
                onChange={(e) => setForm((current) => ({ ...current, website: e.target.value }))}
                className={inputClass}
                placeholder="vispansolution.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className={labelClass} htmlFor="public-email">Email</label>
              <input
                id="public-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                className={inputClass}
                placeholder="agency@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass} htmlFor="public-password">Password</label>
              <input
                id="public-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                className={inputClass}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass} htmlFor="public-confirm-password">Confirm Password</label>
              <input
                id="public-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                className={inputClass}
                placeholder="Repeat your password"
                required
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 px-6 py-5">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Opening Razorpay..." : `Register & Pay ₹${plan.price}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
