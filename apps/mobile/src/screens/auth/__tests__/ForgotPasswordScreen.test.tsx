/// <reference types="jest" />

import type { PropsWithChildren } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { useRequestPasswordReset } from "@/features/auth";
import { ForgotPasswordScreen } from "../ForgotPasswordScreen";

jest.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  ...jest.requireActual("@/features/auth/form-validation"),
  useRequestPasswordReset: jest.fn(),
}));

const useRequestPasswordResetMock = useRequestPasswordReset as jest.Mock;
const requestPasswordReset = jest.fn();

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestPasswordReset.mockReset();
    useRequestPasswordResetMock.mockReturnValue({
      mutateAsync: requestPasswordReset,
      isPending: false,
    });
  });

  it("shows validation without sending an invalid request", () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Email address is required.")).toBeTruthy();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("normalizes the email and shows the generic success response", async () => {
    requestPasswordReset.mockResolvedValue({
      message:
        "If an account exists for this email, password reset instructions will be sent.",
    });
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "  USER@Example.COM ",
    );
    fireEvent.press(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(
        screen.getByText(
          "If an account exists for this email, password reset instructions will be sent.",
        ),
      ).toBeTruthy();
    });
  });

  it("shows a safe fallback when the request fails unexpectedly", async () => {
    requestPasswordReset.mockRejectedValue(new Error("Network failed"));
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "user@example.com",
    );
    fireEvent.press(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(
        screen.getByText("Could not request a password reset."),
      ).toBeTruthy();
    });
  });
});
