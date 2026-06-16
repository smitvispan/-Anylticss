const DEFAULT_DEV_BASE_URL = "http://localhost:3000";

function normalizeOrigin(value: string) {
  return new URL(value).origin;
}

function isLoopbackOrigin(value: string) {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function getAppBaseUrl(fallbackOrigin?: string) {
  const configuredCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
  ].filter(Boolean) as string[];

  const safeConfiguredUrl = configuredCandidates.find((candidate) => {
    if (!isLoopbackOrigin(candidate)) {
      return true;
    }

    if (!fallbackOrigin) {
      return process.env.NODE_ENV !== "production";
    }

    return isLoopbackOrigin(fallbackOrigin);
  });

  const configuredUrl =
    safeConfiguredUrl ||
    fallbackOrigin ||
    (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_BASE_URL : undefined);

  if (!configuredUrl) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL or NEXTAUTH_URL so the app can generate absolute URLs."
    );
  }

  return normalizeOrigin(configuredUrl);
}

export function getApiBaseUrl(fallbackOrigin?: string) {
  return `${getAppBaseUrl(fallbackOrigin)}/api`;
}

export function getRequiredEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
