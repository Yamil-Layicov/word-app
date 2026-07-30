/// <reference types="jest" />

import {
  ApiError,
  getApiRetryAfterSeconds,
  parseRetryAfterSeconds,
  toApiError,
} from "../http-error";

describe("toApiError", () => {
  it("preserves a machine-readable API error code", () => {
    const error = toApiError(403, {
      statusCode: 403,
      message: "Verify your email before logging in.",
      error: "Forbidden",
      code: "EMAIL_VERIFICATION_REQUIRED",
    });

    expect(error.response).toEqual({
      statusCode: 403,
      message: "Verify your email before logging in.",
      error: "Forbidden",
      code: "EMAIL_VERIFICATION_REQUIRED",
    });
  });

  it("does not trust a malformed error code", () => {
    const error = toApiError(403, {
      statusCode: 403,
      message: "Forbidden",
      code: 123,
    });

    expect(error.message).toBe("Forbidden");
    expect(error.response).toBeUndefined();
  });

  it("preserves a valid retry duration from the API response", () => {
    const error = toApiError(429, {
      statusCode: 429,
      message: "Too many attempts. Try again later.",
      error: "Too Many Requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: 899.2,
    });

    expect(error.retryAfterSeconds).toBe(900);
    expect(error.response?.retryAfterSeconds).toBe(899.2);
  });

  it("uses the longest valid retry header as a fallback", () => {
    const headers = createHeaders({
      "retry-after-auth-identity": "120",
      "retry-after-auth-ip": "60",
    });

    expect(parseRetryAfterSeconds(headers)).toBe(120);
  });

  it("supports the standard HTTP-date Retry-After format", () => {
    const now = Date.parse("2026-07-29T10:00:00.000Z");
    const headers = createHeaders({
      "retry-after": "Wed, 29 Jul 2026 10:01:30 GMT",
    });

    expect(parseRetryAfterSeconds(headers, now)).toBe(90);
  });

  it("returns a safe fallback only for rate-limit errors", () => {
    const rateLimitError = new ApiError({
      status: 429,
      message: "Too many attempts.",
    });
    const regularError = new ApiError({
      status: 400,
      message: "Bad request",
    });

    expect(getApiRetryAfterSeconds(rateLimitError)).toBe(60);
    expect(getApiRetryAfterSeconds(regularError)).toBeNull();
  });
});

function createHeaders(values: Record<string, string>): Pick<Headers, "get"> {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}
