export type ApiErrorResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

type ApiErrorInput = {
  status: number;
  message: string;
  response?: ApiErrorResponse;
};

export class ApiError extends Error {
  status: number;
  response?: ApiErrorResponse;

  constructor({ status, message, response }: ApiErrorInput) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
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
    const firstMessage = message.find((item) => typeof item === "string" && item.trim());

    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  return fallback;
}

export function toApiError(status: number, response: unknown) {
  const apiResponse = isApiErrorResponse(response) ? response : undefined;
  const message = normalizeApiErrorMessage(response);

  return new ApiError({
    status,
    message,
    response: apiResponse,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value)) {
    return false;
  }

  const { statusCode, message, error } = value;

  return (
    (statusCode === undefined || typeof statusCode === "number") &&
    (message === undefined ||
      typeof message === "string" ||
      (Array.isArray(message) && message.every((item) => typeof item === "string"))) &&
    (error === undefined || typeof error === "string")
  );
}
