// app/(protected)/en/admin/users/actions.ts
"use server";

import connectDB from "@/lib/mongodb";
import { checkSubscriptionLimit } from "@/lib/subscription-utils";
import { activateSubscriptionForUser } from "@/lib/subscription-billing";
import { getAdminOwnerContext } from "@/lib/admin-user-scope";
import User from "@/models/User";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";

function val(v: FormDataEntryValue | null): string | null {
  const s = v?.toString().trim();
  return s ? s : null;
}

function getBillingMeta(formData: FormData) {
  return {
    paymentId: val(formData.get("billingPaymentId")),
    orderId: val(formData.get("billingOrderId")),
    amountPaid: Number(formData.get("billingAmountPaid")?.toString() || 0),
    creditApplied: Number(formData.get("billingCreditApplied")?.toString() || 0),
  };
}

export async function createUserAction(formData: FormData): Promise<void> {
  const name = formData.get("name")?.toString() ?? null;
  const email = formData.get("email")?.toString() ?? null;
  const password = formData.get("password")?.toString() ?? null;
  const image = formData.get("image")?.toString() ?? null;
  const planId = formData.get("planId")?.toString() || null;

  const mainPage = formData.get("mainPage")?.toString() || null;
  const mainInstagram = formData.get("mainInstagram")?.toString() || null;
  const mainAd = formData.get("mainAd")?.toString() || null;
  const mainGoogleAd = formData.get("mainGoogleAd")?.toString() || null;
  const mainSEOsites = formData.get("mainSEOsites")?.toString() || null;
  const billing = getBillingMeta(formData);

  try {
    await connectDB();
    const ownerContext = await getAdminOwnerContext();
    const ownerId = ownerContext?.ownerId;

    if (!ownerId) {
      redirect("/en/admin/plans?error=no_active_subscription");
    }

    await checkSubscriptionLimit(ownerId, "users");

    const newUser = await User.create({
      name,
      email,
      password,
      image,
      isAdmin: false,
      role: "user",
      parent_client_id: ownerId,
      mainPage: mainPage || undefined,
      mainInstagram: mainInstagram || undefined,
      mainAd: mainAd || undefined,
      mainGoogleAd: mainGoogleAd || undefined,
      mainSEOsites: mainSEOsites || undefined,
      googleSearchConsoleAccounts: mainSEOsites ? [mainSEOsites] : [],
    });

    if (planId) {
      const plan = await Plan.findById(planId);
      if (plan) {
        await activateSubscriptionForUser({
          userId: String(newUser._id),
          plan,
          amountPaid: billing.amountPaid,
          creditApplied: billing.creditApplied,
          paymentId: billing.paymentId,
          orderId: billing.orderId,
        });
      }
    }

    revalidatePath("/en/admin");
    revalidatePath("/en/admin/payments");
    redirect("/en/admin?created=1");
  } catch (err: any) {
    if (err.message && err.message.includes("NEXT_REDIRECT")) throw err;
    if (err?.code === 11000 || err?.code === "P2002") {
      redirect("/en/admin/users/new?error=email_exists");
    }
    redirect(`/en/admin/users/new?error=${encodeURIComponent(err?.message ?? "create_failed")}`);
  }
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString();
  if (!id) notFound();

  const planId = formData.get("planId")?.toString() || null;
  const ownerContext = await getAdminOwnerContext();
  const ownerId = ownerContext?.ownerId;

  if (!ownerId) {
    redirect("/en/admin?error=unauthorized");
  }

  const data = {
    name: val(formData.get("name")),
    email: val(formData.get("email")),
    password: val(formData.get("password")),
    image: val(formData.get("image")),
    mainPage: val(formData.get("mainPage")),
    mainInstagram: val(formData.get("mainInstagram")),
    mainAd: val(formData.get("mainAd")),
    mainGoogleAd: val(formData.get("mainGoogleAd")),
    mainSEOsites: val(formData.get("mainSEOsites")),
  };

  if (!data.password) {
    // @ts-expect-error – delete for update
    delete data.password;
  }

  try {
    await connectDB();
    const existing = await User.findOne({
      _id: id,
      parent_client_id: ownerId,
      role: "user",
      isAdmin: false,
    })
      .select({ _id: 1, client_id: 1, contact_id: 1, activeSubscription: 1 })
      .populate({
        path: "activeSubscription",
        populate: {
          path: "planId",
          select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
        },
      })
      .lean();
    if (!existing) notFound();

    const billing = getBillingMeta(formData);
    const currentPlanId = String((existing as any)?.activeSubscription?.planId?._id || "");

    if (planId && String(planId) !== currentPlanId) {
      const plan = await Plan.findById(planId);
      if (plan) {
        await activateSubscriptionForUser({
          userId: String(existing._id),
          plan,
          currentSubscription: (existing as any).activeSubscription,
          amountPaid: billing.amountPaid,
          creditApplied: billing.creditApplied,
          paymentId: billing.paymentId,
          orderId: billing.orderId,
        });
      }
    }

    await User.findOneAndUpdate(
      {
        _id: id,
        parent_client_id: ownerId,
        role: "user",
        isAdmin: false,
      },
      {
        ...data,
        googleSearchConsoleAccounts: data.mainSEOsites ? [data.mainSEOsites] : [],
      },
      { runValidators: true }
    );
    revalidatePath("/en/admin");
    revalidatePath("/en/admin/payments");
    redirect("/en/admin?updated=1");
  } catch (err: any) {
    if (err.message && err.message.includes("NEXT_REDIRECT")) throw err;
    const msg = (err?.code === 11000 || err?.code === "P2002") ? "email_exists" : (err?.message ?? "update_failed");
    redirect(`/en/admin/users/${id}/edit?error=${encodeURIComponent(msg)}`);
  }
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString();
  if (!id) notFound();
  const ownerContext = await getAdminOwnerContext();
  const ownerId = ownerContext?.ownerId;

  if (!ownerId) {
    redirect("/en/admin?error=unauthorized");
  }

  await connectDB();
  await User.findOneAndDelete({ _id: id, parent_client_id: ownerId, role: "user", isAdmin: false });
  // Also delete subscription?
  await Subscription.deleteMany({ userId: id });

  revalidatePath("/en/admin");
  revalidatePath("/en/admin/payments");
  redirect("/en/admin?deleted=1");
}

export async function updatePlanAction(userId: string, planId: string): Promise<void> {
  try {
    await connectDB();
    const ownerContext = await getAdminOwnerContext();
    const ownerId = ownerContext?.ownerId;
    if (!ownerId) return;

    const user = await User.findOne({
      _id: userId,
      parent_client_id: ownerId,
      role: "user",
      isAdmin: false,
    })
      .select({ _id: 1, activeSubscription: 1 })
      .populate({
        path: "activeSubscription",
        populate: {
          path: "planId",
          select: { _id: 1, name: 1, price: 1, validityMonths: 1 },
        },
      })
      .lean();
    if (!user) return;

    const plan = await Plan.findById(planId);
    if (!plan) return;

    await activateSubscriptionForUser({
      userId: String(user._id),
      plan,
      currentSubscription: (user as any).activeSubscription,
    });

    revalidatePath("/en/admin");
    revalidatePath("/en/admin/payments");
  } catch (err) {
    console.error("Plan update failed:", err);
  }
}
