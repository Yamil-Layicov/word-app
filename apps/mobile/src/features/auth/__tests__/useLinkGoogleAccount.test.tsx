/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import { queryClient } from "@/shared/lib/query-client";
import { linkGoogleAccount } from "../api";
import { useLinkGoogleAccount } from "../hooks/useLinkGoogleAccount";
import type {
  LinkedAuthIdentity,
  LinkGoogleAccountRequest,
} from "../model";
import { authQueryKeys } from "../query-keys";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("../api", () => ({
  linkGoogleAccount: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    setQueryData: jest.fn(),
  },
}));

const mockLinkGoogleAccount = jest.mocked(linkGoogleAccount);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);

type MutationOptions = {
  mutationFn: (input: LinkGoogleAccountRequest) => Promise<LinkedAuthIdentity>;
  onSuccess: (identity: LinkedAuthIdentity) => void;
};

const request: LinkGoogleAccountRequest = { idToken: "google-id-token" };
const linkedIdentity: LinkedAuthIdentity = {
  provider: "GOOGLE",
  email: "user@example.com",
  linkedAt: "2026-08-03T08:00:00.000Z",
};

describe("useLinkGoogleAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds the first linked identity to an empty cache", async () => {
    mockLinkGoogleAccount.mockResolvedValue(linkedIdentity);
    const mutation = getMutation();

    await expect(mutation.mutationFn(request)).resolves.toBe(linkedIdentity);
    mutation.onSuccess(linkedIdentity);

    expect(mockLinkGoogleAccount).toHaveBeenCalledWith(request);
    expect(mockSetQueryData).toHaveBeenCalledWith(
      authQueryKeys.identities(),
      expect.any(Function),
    );
    expect(runIdentityUpdater(undefined)).toEqual([linkedIdentity]);
  });

  it("replaces an existing identity from the same provider", () => {
    const previousIdentity: LinkedAuthIdentity = {
      provider: "GOOGLE",
      email: "old@example.com",
      linkedAt: "2026-08-01T08:00:00.000Z",
    };
    const mutation = getMutation();

    mutation.onSuccess(linkedIdentity);

    expect(runIdentityUpdater([previousIdentity])).toEqual([linkedIdentity]);
  });

  it("does not update identity cache when linking fails", async () => {
    mockLinkGoogleAccount.mockRejectedValue(new Error("Request failed"));
    const mutation = getMutation();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockSetQueryData).not.toHaveBeenCalled();
  });
});

function getMutation(): MutationOptions {
  const { result } = renderHook(() => useLinkGoogleAccount());
  return result.current as unknown as MutationOptions;
}

function runIdentityUpdater(current: LinkedAuthIdentity[] | undefined) {
  const updater = mockSetQueryData.mock.calls[0]?.[1] as (
    value: LinkedAuthIdentity[] | undefined,
  ) => LinkedAuthIdentity[];

  return updater(current);
}
