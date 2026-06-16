import User from "@/models/User";
import { resolveClientIdentifiers } from "@/lib/client-identifiers";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

function deriveName(name?: string | null, email?: string | null) {
  const normalizedName = name?.trim();
  if (normalizedName) return normalizedName;

  const localPart = email?.split("@")[0]?.trim() || "Admin Billing";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export async function ensureAdminBillingUser(params: {
  email?: string | null;
  name?: string | null;
}) {
  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail) return null;

  const existing = await User.findOne({
    email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
    isAdmin: false,
  })
    .select({ _id: 1 })
    .lean();

  if (existing?._id) {
    return String(existing._id);
  }

  const identifiers = await resolveClientIdentifiers({ isAdmin: false });
  const created = await User.create({
    name: deriveName(params.name, normalizedEmail),
    email: normalizedEmail,
    role: "client",
    isAdmin: false,
    client_id: identifiers.client_id,
    contact_id: identifiers.contact_id,
    ERP_token: identifiers.ERP_token,
  });

  return String(created._id);
}
