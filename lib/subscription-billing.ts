import mongoose from "mongoose";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

const DAY_MS = 24 * 60 * 60 * 1000;
export const BILLING_RECORD_SOURCE = "billing_v1";

export type SubscriptionPaymentMode = "razorpay" | "credit_only" | "free_admin";

type PlanLike = {
  _id?: unknown;
  name?: string | null;
  price?: number | null;
  validityMonths?: number | null;
  canResell?: boolean | null;
};

type SubscriptionLike = {
  _id?: unknown;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  amountPaid?: number | null;
  planPrice?: number | null;
  creditApplied?: number | null;
  recordSource?: string | null;
  planId?: PlanLike | string | null;
};

function toDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toAmount(value?: number | string | null) {
  return roundCurrency(Number(value || 0));
}

function getPlanId(plan: PlanLike | string | null | undefined) {
  if (!plan) return "";
  if (typeof plan === "string") return plan;
  return String(plan._id || "");
}

function getPlanName(plan: PlanLike | string | null | undefined) {
  if (!plan || typeof plan === "string") return null;
  return plan.name || null;
}

function getPlanPrice(plan: PlanLike | string | null | undefined) {
  if (!plan || typeof plan === "string") return 0;
  return Number(plan.price || 0);
}

function getCurrentSubscriptionValue(subscription?: SubscriptionLike | null) {
  if (!subscription) return 0;

  if (typeof subscription.planPrice === "number" && Number.isFinite(subscription.planPrice)) {
    return Number(subscription.planPrice);
  }

  const amountPaid = Number(subscription.amountPaid || 0);
  const creditApplied = Number(subscription.creditApplied || 0);
  const computed = amountPaid + creditApplied;
  if (computed > 0) return computed;

  return getPlanPrice(subscription.planId);
}

function getRemainingRatio(subscription?: SubscriptionLike | null, now = new Date()) {
  if (!subscription) return 0;

  const startDate = toDate(subscription.startDate);
  const endDate = toDate(subscription.endDate);

  if (!startDate || !endDate) return 0;

  const totalMs = endDate.getTime() - startDate.getTime();
  const remainingMs = endDate.getTime() - now.getTime();

  if (totalMs <= 0 || remainingMs <= 0) return 0;
  return Math.min(1, Math.max(0, remainingMs / totalMs));
}

export function formatBillingAmount(value: number) {
  return roundCurrency(value).toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function getSubscriptionPaymentMode(subscription?: {
  amountPaid?: number | null;
  creditApplied?: number | null;
} | null): SubscriptionPaymentMode {
  const amountPaid = toAmount(subscription?.amountPaid);
  const creditApplied = toAmount(subscription?.creditApplied);

  if (amountPaid > 0) return "razorpay";
  if (creditApplied > 0) return "credit_only";
  return "free_admin";
}

export function getSubscriptionPaymentModeLabel(mode: SubscriptionPaymentMode) {
  switch (mode) {
    case "razorpay":
      return "Razorpay";
    case "credit_only":
      return "Credit Only";
    case "free_admin":
    default:
      return "Free / Admin";
  }
}

export function getSubscriptionGrossBilled(subscription?: {
  amountPaid?: number | null;
  creditApplied?: number | null;
  planPrice?: number | null;
  planId?: PlanLike | string | null;
} | null) {
  const amountPaid = toAmount(subscription?.amountPaid);
  const creditApplied = toAmount(subscription?.creditApplied);
  const gross = roundCurrency(amountPaid + creditApplied);
  if (gross > 0) return gross;

  const planPrice =
    typeof subscription?.planPrice === "number"
      ? toAmount(subscription.planPrice)
      : getPlanPrice(subscription?.planId);
  return planPrice;
}

export function buildSubscriptionEndDate(startDate: Date, validityMonths?: number | null) {
  const months = Math.max(1, Number(validityMonths || 12));
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);
  return endDate;
}

export function calculatePlanBillingPreview(params: {
  currentSubscription?: SubscriptionLike | null;
  targetPlan: PlanLike;
  now?: Date;
}) {
  const { currentSubscription, targetPlan } = params;
  const now = params.now || new Date();

  const targetPlanId = getPlanId(targetPlan);
  const currentPlanId = getPlanId(currentSubscription?.planId);
  const targetPrice = roundCurrency(Number(targetPlan.price || 0));
  const isCurrentPlan = Boolean(targetPlanId && currentPlanId && targetPlanId === currentPlanId);

  const startDate = toDate(currentSubscription?.startDate);
  const endDate = toDate(currentSubscription?.endDate);
  const periodMs =
    startDate && endDate ? Math.max(0, endDate.getTime() - startDate.getTime()) : 0;
  const remainingMs = endDate ? Math.max(0, endDate.getTime() - now.getTime()) : 0;
  const remainingDays = remainingMs > 0 ? Math.ceil(remainingMs / DAY_MS) : 0;
  const billingCycleDays = periodMs > 0 ? Math.ceil(periodMs / DAY_MS) : 0;

  const currentPlanValue = getCurrentSubscriptionValue(currentSubscription);
  const currentCredit = isCurrentPlan
    ? 0
    : roundCurrency(currentPlanValue * getRemainingRatio(currentSubscription, now));
  const payableAmount = isCurrentPlan
    ? 0
    : roundCurrency(Math.max(0, targetPrice - currentCredit));

  return {
    currentPlanId,
    currentPlanName: getPlanName(currentSubscription?.planId),
    targetPlanId,
    targetPlanName: targetPlan.name || null,
    targetPlanPrice: targetPrice,
    currentPlanValue: roundCurrency(currentPlanValue),
    creditAmount: currentCredit,
    payableAmount,
    isCurrentPlan,
    isUpgrade: targetPrice > getPlanPrice(currentSubscription?.planId),
    isDowngrade: targetPrice < getPlanPrice(currentSubscription?.planId),
    remainingDays,
    billingCycleDays,
    currentStartDate: startDate,
    currentEndDate: endDate,
  };
}

export async function activateSubscriptionForUser(params: {
  userId: string;
  plan: PlanLike;
  currentSubscription?: SubscriptionLike | null;
  paymentId?: string | null;
  orderId?: string | null;
  amountPaid?: number;
  creditApplied?: number;
  activatedAt?: Date;
}) {
  const {
    userId,
    plan,
    currentSubscription,
    paymentId,
    orderId,
    amountPaid = 0,
    creditApplied = 0,
    activatedAt = new Date(),
  } = params;

  const previousSubscriptionId = currentSubscription?._id ? String(currentSubscription._id) : null;
  const previousPlanId = getPlanId(currentSubscription?.planId) || null;
  const nextPlanId = getPlanId(plan);

  if (!nextPlanId) {
    throw new Error("Target plan is missing an id");
  }

  await Subscription.updateMany(
    { userId, status: "active" },
    {
      $set: {
        status: "canceled",
        canceledAt: activatedAt,
        updatedAt: activatedAt,
      },
    }
  );

  const subscription = await Subscription.create({
    userId: new mongoose.Types.ObjectId(userId),
    planId: new mongoose.Types.ObjectId(nextPlanId),
    status: "active",
    startDate: activatedAt,
    endDate: buildSubscriptionEndDate(activatedAt, plan.validityMonths),
    paymentId: paymentId || undefined,
    orderId: orderId || undefined,
    amountPaid: roundCurrency(Number(amountPaid || 0)),
    planPrice: roundCurrency(Number(plan.price || 0)),
    creditApplied: roundCurrency(Number(creditApplied || 0)),
    previousSubscriptionId: previousSubscriptionId
      ? new mongoose.Types.ObjectId(previousSubscriptionId)
      : undefined,
    previousPlanId: previousPlanId
      ? new mongoose.Types.ObjectId(previousPlanId)
      : undefined,
    recordSource: BILLING_RECORD_SOURCE,
  });

  await User.findByIdAndUpdate(userId, { activeSubscription: subscription._id });

  return subscription;
}
