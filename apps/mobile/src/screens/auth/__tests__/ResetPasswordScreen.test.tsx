/// <reference types="jest" />

import type { PropsWithChildren } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuthSession, useResetPassword } from "@/features/auth";
import { ResetPasswordScreen } from "../ResetPasswordScreen";

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
  useAuthSession: jest.fn(),
  useResetPassword: jest.fn(),
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useAuthSessionMock = useAuthSession as jest.Mock;
const useResetPasswordMock = useResetPassword as jest.Mock;
const resetPassword = jest.fn();
const endSession = jest.fn();
const router = {
  replace: jest.fn(),
};
const token = "a".repeat(43);

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPassword.mockReset();
    endSession.mockReset();
    endSession.mockResolvedValue(undefined);
    useLocalSearchParamsMock.mockReturnValue({
      token,
    });
    useRouterMock.mockReturnValue(router);
    useAuthSessionMock.mockReturnValue({
      endSession,
    });
    useResetPasswordMock.mockReturnValue({
      mutateAsync: resetPassword,
      isPending: false,
    });
  });

  it("blocks a reset link without a valid token", () => {
    useLocalSearchParamsMock.mockReturnValue({});
    render(<ResetPasswordScreen />);

    expect(
      screen.getByText("This password reset link is invalid or incomplete."),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Reset password" }));

    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("shows validation when the new passwords do not match", () => {
    render(<ResetPasswordScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("New password"),
      "new-password",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirm new password"),
      "different-password",
    );
    fireEvent.press(screen.getByRole("button", { name: "Reset password" }));

    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("resets the password and returns to login", async () => {
    resetPassword.mockResolvedValue({
      message: "Your password has been reset. Log in with your new password.",
    });
    useLocalSearchParamsMock.mockReturnValue({
      token: [token],
    });
    render(<ResetPasswordScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("New password"),
      "new-password",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirm new password"),
      "new-password",
    );
    fireEvent.press(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        token,
        newPassword: "new-password",
      });
      expect(endSession).toHaveBeenCalledWith({
        revokeServerSession: false,
      });
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/login",
        params: {
          notice: "password-reset",
        },
      });
    });
  });

  it("shows a safe fallback when the request fails unexpectedly", async () => {
    resetPassword.mockRejectedValue(new Error("Network failed"));
    render(<ResetPasswordScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("New password"),
      "new-password",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirm new password"),
      "new-password",
    );
    fireEvent.press(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(screen.getByText("Could not reset your password.")).toBeTruthy();
    });
  });
});
