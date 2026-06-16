import { auth } from "@/lib/auth";
import { ensureAdminBillingUser } from "@/lib/admin-billing-user";
import connectDB from "@/lib/mongodb";

export async function getAdminOwnerContext() {
  const session = await auth();
  const adminEmail = session?.user?.email?.trim() || "";

  if (!adminEmail) {
    return null;
  }

  await connectDB();

  const ownerId = await ensureAdminBillingUser({
    email: adminEmail,
    name: session?.user?.name || null,
  });

  if (!ownerId) {
    return null;
  }

  return {
    ownerId,
    adminEmail,
    adminName: session?.user?.name || null,
  };
}
