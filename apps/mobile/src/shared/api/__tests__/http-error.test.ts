/// <reference types="jest" />

import { toApiError } from "../http-error";

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
});
