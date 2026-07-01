import { baseClient } from "@/shared/api/base-client";
import { getAccessToken } from "./access-token-memory";

type ReadOptions = Parameters<typeof baseClient.get>[1];
type WriteOptions = Parameters<typeof baseClient.post>[2];

export const authClient = {
  get<TResponse>(path: string, options?: ReadOptions) {
    return baseClient.get<TResponse>(path, withAuthorization(options));
  },

  post<TResponse>(path: string, body?: unknown, options?: WriteOptions) {
    return baseClient.post<TResponse>(path, body, withAuthorization(options));
  },

  patch<TResponse>(path: string, body?: unknown, options?: WriteOptions) {
    return baseClient.patch<TResponse>(path, body, withAuthorization(options));
  },

  delete<TResponse>(path: string, options?: ReadOptions) {
    return baseClient.delete<TResponse>(path, withAuthorization(options));
  },
};

function withAuthorization<TOptions extends { headers?: HeadersInit } | undefined>(
  options: TOptions,
) {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return options;
  }

  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return {
    ...(options ?? {}),
    headers,
  } as TOptions;
}
