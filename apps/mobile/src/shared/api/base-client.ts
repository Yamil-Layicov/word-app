import { env } from "@/shared/config/env";
import { toApiError } from "@/shared/api/http-error";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: QueryParams;
};

async function request<TResponse>(
  path: string,
  { body, query, headers, ...init }: ApiRequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: buildHeaders(headers, body),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw toApiError(response.status, responseBody);
  }

  return responseBody as TResponse;
}

export const baseClient = {
  get<TResponse>(
    path: string,
    options?: Omit<ApiRequestOptions, "body" | "method">,
  ) {
    return request<TResponse>(path, { ...options, method: "GET" });
  },

  post<TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "body" | "method">,
  ) {
    return request<TResponse>(path, { ...options, method: "POST", body });
  },

  put<TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "body" | "method">,
  ) {
    return request<TResponse>(path, { ...options, method: "PUT", body });
  },

  patch<TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "body" | "method">,
  ) {
    return request<TResponse>(path, { ...options, method: "PATCH", body });
  },

  delete<TResponse>(
    path: string,
    options?: Omit<ApiRequestOptions, "body" | "method">,
  ) {
    return request<TResponse>(path, { ...options, method: "DELETE" });
  },

  request,
};

function buildUrl(path: string, query?: QueryParams) {
  const baseUrl = path.startsWith("http")
    ? path
    : `${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const searchParams = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function buildHeaders(headers: HeadersInit | undefined, body: unknown) {
  const nextHeaders = new Headers(headers);

  if (body !== undefined && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  if (!nextHeaders.has("Accept")) {
    nextHeaders.set("Accept", "application/json");
  }

  return nextHeaders;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return JSON.parse(text) as unknown;
  }

  return text;
}
