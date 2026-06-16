import User from "@/models/User";

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function nextNumericIdentifier(field: "client_id" | "contact_id") {
  const docs = await User.find({ [field]: { $type: "string" } })
    .select({ [field]: 1 })
    .lean();

  let max = 0;
  for (const doc of docs as Array<Record<string, unknown>>) {
    const raw = doc[field];
    if (typeof raw !== "string" || !/^\d+$/.test(raw)) continue;

    const value = Number(raw);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }

  return String(max + 1);
}

export async function resolveClientIdentifiers({
  clientId,
  contactId,
  isAdmin = false,
}: {
  clientId?: string | null;
  contactId?: string | null;
  isAdmin?: boolean;
}) {
  if (isAdmin) {
    return {
      client_id: null,
      contact_id: null,
      ERP_token: null,
    };
  }

  let resolvedClientId = normalize(clientId);
  let resolvedContactId = normalize(contactId);

  if (!resolvedClientId) {
    resolvedClientId = await nextNumericIdentifier("client_id");
  }

  if (!resolvedContactId) {
    resolvedContactId = await nextNumericIdentifier("contact_id");
  }

  return {
    client_id: resolvedClientId,
    contact_id: resolvedContactId,
    ERP_token: null,
  };
}
