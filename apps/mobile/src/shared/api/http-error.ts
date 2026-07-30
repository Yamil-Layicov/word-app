export type ApiErrorResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
};

type ApiErrorInput = {
  status: number;
  message: string;
  response?: ApiErrorResponse;
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  status: number;
  response?: ApiErrorResponse;
  retryAfterSeconds?: number;

  constructor({ status, message, response, retryAfterSeconds }: ApiErrorInput) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function normalizeApiErrorMessage(
  response: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (!isRecord(response)) {
    return fallback;
  }

  const { message } = response;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const firstMessage = message.find(
      (item) => typeof item === "string" && item.trim(),
    );

    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  return fallback;
}

export function toApiError(
  status: number,
  response: unknown,
  headerRetryAfterSeconds?: number,
) {
  const apiResponse = isApiErrorResponse(response) ? response : undefined;
  const message = normalizeApiErrorMessage(response);
  const retryAfterSeconds =
    normalizeRetryAfterSeconds(apiResponse?.retryAfterSeconds) ??
    normalizeRetryAfterSeconds(headerRetryAfterSeconds);

  return new ApiError({
    status,
    message,
    response: apiResponse,
    retryAfterSeconds,
  });
}

export function parseRetryAfterSeconds(
  headers: Pick<Headers, "get">,
  now = Date.now(),
): number | undefined {
  const retryAfterValues = [
    headers.get("retry-after-auth-identity"),
    headers.get("retry-after-auth-ip"),
    headers.get("retry-after"),
  ];
  const parsedValues = retryAfterValues
    .map((value) => parseRetryAfterValue(value, now))
    .filter((value): value is number => value !== undefined);

  return parsedValues.length > 0 ? Math.max(...parsedValues) : undefined;
}

export function getApiRetryAfterSeconds(
  error: unknown,
  fallbackSeconds = 60,
): number | null {
  if (!isApiError(error) || error.status !== 429) {
    return null;
  }

  return (
    normalizeRetryAfterSeconds(error.retryAfterSeconds) ??
    normalizeRetryAfterSeconds(fallbackSeconds) ??
    60
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value)) {
    return false;
  }

  const { statusCode, message, error, code, retryAfterSeconds } = value;

  return (
    (statusCode === undefined || typeof statusCode === "number") &&
    (message === undefined ||
      typeof message === "string" ||
      (Array.isArray(message) &&
        message.every((item) => typeof item === "string"))) &&
    (error === undefined || typeof error === "string") &&
    (code === undefined || typeof code === "string") &&
    (retryAfterSeconds === undefined ||
      normalizeRetryAfterSeconds(retryAfterSeconds) !== undefined)
  );
}

function parseRetryAfterValue(
  value: string | null,
  now: number,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    return normalizeRetryAfterSeconds(numericValue);
  }

  const retryAt = Date.parse(value);

  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return normalizeRetryAfterSeconds((retryAt - now) / 1_000);
}

function normalizeRetryAfterSeconds(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.ceil(value);
}
