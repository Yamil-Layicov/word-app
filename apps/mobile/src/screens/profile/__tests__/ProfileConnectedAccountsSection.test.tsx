/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import {
  isGoogleSignInSupported,
  requestGoogleIdToken,
  useAuthFailureRedirect,
  useAuthIdentitiesQuery,
  useLinkGoogleAccount,
} from "@/features/auth";
import { ApiError } from "@/shared/api/http-error";
import { ProfileConnectedAccountsSection } from "../ProfileConnectedAccountsSection";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  getGoogleSignInErrorMessage: () =>
    "Could not continue with Google. Please try again.",
  isGoogleSignInSupported: jest.fn(),
  requestGoogleIdToken: jest.fn(),
  useAuthFailureRedirect: jest.fn(),
  useAuthIdentitiesQuery: jest.fn(),
  useLinkGoogleAccount: jest.fn(),
}));

const isGoogleSignInSupportedMock =
  isGoogleSignInSupported as unknown as jest.Mock;
const requestGoogleIdTokenMock = requestGoogleIdToken as jest.Mock;
const useAuthFailureRedirectMock =
  useAuthFailureRedirect as unknown as jest.Mock;
const useAuthIdentitiesQueryMock = useAuthIdentitiesQuery as jest.Mock;
const useLinkGoogleAccountMock = useLinkGoogleAccount as jest.Mock;
const linkGoogleAccount = jest.fn();
const refetchIdentities = jest.fn();

describe("ProfileConnectedAccountsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    linkGoogleAccount.mockReset();
    refetchIdentities.mockReset();
    isGoogleSignInSupportedMock.mockReturnValue(true);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useAuthIdentitiesQueryMock.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchIdentities,
    });
    useLinkGoogleAccountMock.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: linkGoogleAccount,
    });
  });

  it("connects the selected Google account", async () => {
    requestGoogleIdTokenMock.mockResolvedValue({
      status: "SUCCESS",
      idToken: "google-id-token",
    });
    linkGoogleAccount.mockResolvedValue({
      provider: "GOOGLE",
      email: "user@example.com",
      linkedAt: "2026-07-30T10:00:00.000Z",
    });
    render(<ProfileConnectedAccountsSection />);

    fireEvent.press(
      screen.getByRole("button", { name: "Connect Google account" }),
    );

    await waitFor(() => {
      expect(requestGoogleIdTokenMock).toHaveBeenCalledTimes(1);
      expect(linkGoogleAccount).toHaveBeenCalledWith({
        idToken: "google-id-token",
      });
      expect(screen.getByText("Google account connected.")).toBeTruthy();
    });
  });

  it("does not call the backend when account selection is cancelled", async () => {
    requestGoogleIdTokenMock.mockResolvedValue({ status: "CANCELLED" });
    render(<ProfileConnectedAccountsSection />);

    fireEvent.press(
      screen.getByRole("button", { name: "Connect Google account" }),
    );

    await waitFor(() => {
      expect(requestGoogleIdTokenMock).toHaveBeenCalledTimes(1);
    });
    expect(linkGoogleAccount).not.toHaveBeenCalled();
  });

  it("shows the connected Google identity", () => {
    useAuthIdentitiesQueryMock.mockReturnValue({
      data: [
        {
          provider: "GOOGLE",
          email: "user@example.com",
          linkedAt: "2026-07-30T10:00:00.000Z",
        },
      ],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchIdentities,
    });
    render(<ProfileConnectedAccountsSection />);

    expect(screen.getByText("user@example.com")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Connect Google account" }),
    ).toBeNull();
  });

  it("shows the backend account-linking policy error", async () => {
    requestGoogleIdTokenMock.mockResolvedValue({
      status: "SUCCESS",
      idToken: "google-id-token",
    });
    linkGoogleAccount.mockRejectedValue(
      new ApiError({
        status: 409,
        message:
          "Choose the Google account that uses the same email as your Word App account.",
      }),
    );
    render(<ProfileConnectedAccountsSection />);

    fireEvent.press(
      screen.getByRole("button", { name: "Connect Google account" }),
    );

    expect(
      await screen.findByText(
        "Choose the Google account that uses the same email as your Word App account.",
      ),
    ).toBeTruthy();
  });
});
