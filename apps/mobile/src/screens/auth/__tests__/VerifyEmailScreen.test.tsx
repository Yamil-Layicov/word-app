/// <reference types="jest" />

import type { PropsWithChildren } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useConfirmEmailVerification,
  useRequestEmailVerification,
} from "@/features/auth";
import { ApiError } from "@/shared/api/http-error";
import { VerifyEmailScreen } from "../VerifyEmailScreen";

jest.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => children,
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  ...jest.requireActual("@/features/auth/auth-route-notice"),
  ...jest.requireActual("@/features/auth/form-validation"),
  useConfirmEmailVerification: jest.fn(),
  useRequestEmailVerification: jest.fn(),
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useConfirmEmailVerificationMock =
  useConfirmEmailVerification as jest.Mock;
const useRequestEmailVerificationMock =
  useRequestEmailVerification as jest.Mock;
const confirmEmail = jest.fn();
const requestEmail = jest.fn();
const router = {
  replace: jest.fn(),
};
const token = "a".repeat(43);

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirmEmail.mockReset();
    requestEmail.mockReset();
    useRouterMock.mockReturnValue(router);
    useLocalSearchParamsMock.mockReturnValue({
      email: "user@example.com",
    });
    useConfirmEmailVerificationMock.mockReturnValue({
      mutateAsync: confirmEmail,
      isPending: false,
    });
    useRequestEmailVerificationMock.mockReturnValue({
      mutateAsync: requestEmail,
      isPending: false,
    });
  });

  it("shows the registered email and resends a generic verification response", async () => {
    requestEmail.mockResolvedValue({
      message:
        "If this email belongs to an unverified account, verification instructions will be sent.",
    });
    render(<VerifyEmailScreen />);

    expect(
      screen.getByText("We sent a verification link to user@example.com."),
    ).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "Resend verification email" }),
    );

    await waitFor(() => {
      expect(requestEmail).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(
        screen.getByText(
          "If this email belongs to an unverified account, verification instructions will be sent.",
        ),
      ).toBeTruthy();
    });
  });

  it("confirms a valid deep link once and returns to login", async () => {
    confirmEmail.mockResolvedValue({
      message: "Your email has been verified. You can now log in.",
    });
    useLocalSearchParamsMock.mockReturnValue({
      token: [token],
    });
    render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(confirmEmail).toHaveBeenCalledWith({ token });
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/login",
        params: {
          notice: "email-verified",
        },
      });
    });
    expect(confirmEmail).toHaveBeenCalledTimes(1);
  });

  it("blocks an invalid deep link without calling the API", () => {
    useLocalSearchParamsMock.mockReturnValue({
      token: "invalid-token",
    });
    render(<VerifyEmailScreen />);

    expect(
      screen.getByText(
        "This email verification link is invalid or incomplete.",
      ),
    ).toBeTruthy();
    expect(confirmEmail).not.toHaveBeenCalled();
  });

  it("shows the safe API error for an expired or consumed link", async () => {
    confirmEmail.mockRejectedValue(
      new ApiError({
        status: 400,
        message: "Email verification link is invalid or expired",
      }),
    );
    useLocalSearchParamsMock.mockReturnValue({
      token,
    });
    render(<VerifyEmailScreen />);

    expect(
      await screen.findByText("Email verification link is invalid or expired"),
    ).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("retries confirmation after a temporary failure", async () => {
    confirmEmail
      .mockRejectedValueOnce(new Error("Network failed"))
      .mockResolvedValueOnce({
        message: "Your email has been verified. You can now log in.",
      });
    useLocalSearchParamsMock.mockReturnValue({
      token,
    });
    render(<VerifyEmailScreen />);

    fireEvent.press(
      await screen.findByRole("button", {
        name: "Try again",
      }),
    );

    await waitFor(() => {
      expect(confirmEmail).toHaveBeenCalledTimes(2);
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/login",
        params: {
          notice: "email-verified",
        },
      });
    });
  });
});
