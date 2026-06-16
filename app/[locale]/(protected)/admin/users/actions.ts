// app/(protected)/en/admin/users/actions.ts
"use server";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";

function val(v: FormDataEntryValue | null): string | null {
  const s = v?.toString().trim();
  return s ? s : null;
}

export async function createUserAction(formData: FormData): Promise<void> {
  const name = formData.get("name")?.toString() ?? null;
  const email = formData.get("email")?.toString() ?? null;
  const password = formData.get("password")?.toString() ?? null;
  const image = formData.get("image")?.toString() ?? null;
  const isAdmin = formData.get("isAdmin") === "on";

  const mainPage = formData.get("mainPage")?.toString() || null;
  const mainInstagram = formData.get("mainInstagram")?.toString() || null;
  const mainAd = formData.get("mainAd")?.toString() || null;
  const mainGoogleAd = formData.get("mainGoogleAd")?.toString() || null;
  const mainSEOsites = formData.get("mainSEOsites")?.toString() || null;

  try {
    await connectDB();

    await User.create({
      name,
      email,
      password,
      image,
      isAdmin,
      mainPage: mainPage || undefined,
      mainInstagram: mainInstagram || undefined,
      mainAd: mainAd || undefined,
      mainGoogleAd: mainGoogleAd || undefined,
      mainSEOsites: mainSEOsites || undefined,
    });

    revalidatePath("/en/admin"); // or "/en/admin/users" if that's your list page
    redirect("/en/admin?created=1");
  } catch (err: any) {
    // e.g., unique email error
    if (err?.code === 11000 || err?.code === "P2002") {
      redirect("/en/admin/users/new?error=email_exists");
    }
    redirect(`/en/admin/users/new?error=${encodeURIComponent(err?.message ?? "create_failed")}`);
  }
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString();
  if (!id) notFound();

  const data = {
    name: val(formData.get("name")),
    email: val(formData.get("email")),
    password: val(formData.get("password")), // store hash in real apps
    image: val(formData.get("image")),
    isAdmin: formData.get("isAdmin") === "on",
    mainPage: val(formData.get("mainPage")),
    mainInstagram: val(formData.get("mainInstagram")),
    mainAd: val(formData.get("mainAd")),
    mainGoogleAd: val(formData.get("mainGoogleAd")),
    mainSEOsites: val(formData.get("mainSEOsites"))
  };

  // if password is empty, don't update it
  if (!data.password) {
    // @ts-expect-error – delete for update
    delete data.password;
  }

  try {
    await connectDB();
    await User.findByIdAndUpdate(id, data, { runValidators: true });
    revalidatePath("/en/admin");
    redirect("/en/admin?updated=1");
  } catch (err: any) {
    // unique email case etc.
    const msg = (err?.code === 11000 || err?.code === "P2002") ? "email_exists" : (err?.message ?? "update_failed");
    redirect(`/en/admin/users/${id}/edit?error=${encodeURIComponent(msg)}`);
  }
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString();
  if (!id) notFound();

  await connectDB();
  await User.findByIdAndDelete(id);
  revalidatePath("/en/admin");
  redirect("/en/admin?deleted=1");
}
