/// <reference types="jest" />

import { baseClient } from "../base-client";

describe("baseClient retry metadata", () => {
  const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("maps a named Retry-After header onto ApiError", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        status: 429,
        body: {
          statusCode: 429,
          message: "Too many attempts. Try again later.",
          error: "Too Many Requests",
          code: "RATE_LIMIT_EXCEEDED",
        },
        headers: {
          "retry-after-auth-identity": "120",
        },
      }),
    );

    await expect(
      baseClient.post("/auth/login", {
        email: "user@example.com",
        password: "wrongpass",
      }),
    ).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 120,
      response: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });
});

type JsonResponseInput = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

function createJsonResponse({
  status,
  body,
  headers = {},
}: JsonResponseInput): Response {
  const normalizedHeaders = new Map(
    Object.entries({
      "content-type": "application/json",
      ...headers,
    }).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        return normalizedHeaders.get(name.toLowerCase()) ?? null;
      },
    },
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}
