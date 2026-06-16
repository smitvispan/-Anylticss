export const UNLIMITED_PLAN_LIMIT = -1;

function toLimitNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function isUnlimitedPlanLimit(value: unknown) {
  return toLimitNumber(value) === UNLIMITED_PLAN_LIMIT;
}

export function hasReachedPlanLimit(currentCount: number, limit: unknown) {
  if (isUnlimitedPlanLimit(limit)) {
    return false;
  }

  return currentCount >= toLimitNumber(limit);
}

export function formatPlanLimit(
  value: unknown,
  options?: {
    unlimitedLabel?: string;
    zeroLabel?: string | null;
  }
) {
  const unlimitedLabel = options?.unlimitedLabel || "Unlimited";
  const zeroLabel = options?.zeroLabel;

  if (isUnlimitedPlanLimit(value)) {
    return unlimitedLabel;
  }

  const numericValue = toLimitNumber(value);
  if (numericValue === 0 && zeroLabel) {
    return zeroLabel;
  }

  return String(numericValue);
}

export function formatPlanSeatUsage(currentCount: number, limit: unknown) {
  if (isUnlimitedPlanLimit(limit)) {
    return `${currentCount} / Unlimited`;
  }

  return `${currentCount} / ${toLimitNumber(limit)}`;
}
