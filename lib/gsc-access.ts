function splitEntry(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseGscAccessIds(formData: FormData, fieldName = "gscAccessIds") {
  const rawValues = formData
    .getAll(fieldName)
    .map((value) => value?.toString().trim())
    .filter(Boolean) as string[];

  return Array.from(new Set(rawValues.flatMap(splitEntry)));
}

export function normalizeGscAssignments(params: {
  mainSEOsites?: string | null;
  accessIds?: string[];
}) {
  const cleanedIds = Array.from(
    new Set((params.accessIds || []).map((value) => value.trim()).filter(Boolean))
  );

  const requestedMain = params.mainSEOsites?.trim() || null;

  if (requestedMain && !cleanedIds.includes(requestedMain)) {
    cleanedIds.unshift(requestedMain);
  }

  const mainSEOsites = requestedMain || cleanedIds[0] || null;

  return {
    mainSEOsites,
    googleSearchConsoleAccounts: cleanedIds,
  };
}
