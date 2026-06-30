const DEFAULT_API_URL = "http://localhost:4000";

function normalizeApiUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return DEFAULT_API_URL;
  }

  return trimmed.replace(/\/+$/, "");
}

export const env = {
  apiUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL),
} as const;

