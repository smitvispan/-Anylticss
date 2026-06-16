"use client";

import { Link } from "@/i18n/routing";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

type CreateUserButtonProps = {
  hasActivePlan: boolean;
  hasCapacity: boolean;
  usedSeats: number;
  seatLimitLabel: string;
  currentPlanName?: string | null;
};

export default function CreateUserButton({
  hasActivePlan,
  hasCapacity,
  usedSeats,
  seatLimitLabel,
  currentPlanName,
}: CreateUserButtonProps) {
  if (hasActivePlan && hasCapacity) {
    return (
      <Link
        href="/admin/users/new"
        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
      >
        <span className="text-base leading-none">+</span>
        Create user
      </Link>
    );
  }

  const title = hasActivePlan ? "Upgrade required" : "Select a plan first";
  const description = hasActivePlan
    ? `Your ${currentPlanName || "current"} plan allows a maximum of ${seatLimitLabel} user${seatLimitLabel === "1" ? "" : "s"}. You have already created ${usedSeats} user${usedSeats === 1 ? "" : "s"}.`
    : "An active subscription plan is required before you can create a user.";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        >
          <span className="text-base leading-none">+</span>
          Create user
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border border-amber-200 bg-white p-0 shadow-2xl">
        <div className="border-b border-amber-100 bg-amber-50/70 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <Icon icon="lucide:triangle-alert" className="h-6 w-6" />
            </div>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold text-slate-900">{title}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current Plan</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{currentPlanName || "No active plan"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">User Seats</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {hasActivePlan ? `${usedSeats} / ${seatLimitLabel}` : "0 / 0"}
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-5">
          <Link
            href="/admin/plans"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Icon icon="lucide:arrow-up-right" className="h-4 w-4" />
            Open Subscription Plans
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
