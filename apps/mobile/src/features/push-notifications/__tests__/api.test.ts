/// <reference types="jest" />

import { authClient } from "@/auth";
import { registerPushToken } from "../api";
import type { RegisterPushTokenRequest } from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    put: jest.fn(),
  },
}));

const putMock = authClient.put as jest.Mock;

describe("push notification API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers the current device token without expecting a response body", async () => {
    const input: RegisterPushTokenRequest = {
      token: "ExponentPushToken[device-token-1]",
      platform: "ANDROID",
    };
    putMock.mockResolvedValue(undefined);

    await expect(registerPushToken(input)).resolves.toBeUndefined();

    expect(putMock).toHaveBeenCalledWith("/me/push-tokens", input);
  });
});
