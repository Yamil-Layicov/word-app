/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { useLogout } from "@/features/auth";
import { ProfileLogoutSection } from "../ProfileLogoutSection";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  useLogout: jest.fn(),
}));

const useLogoutMock = useLogout as jest.Mock;
const logout = jest.fn();

describe("ProfileLogoutSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logout.mockReset();
    useLogoutMock.mockReturnValue(logout);
  });

  it("requires confirmation before logging out", () => {
    render(<ProfileLogoutSection />);

    fireEvent.press(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByText("Log out?")).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Cancel log out" }));

    expect(screen.queryByText("Log out?")).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out once and replaces the route", async () => {
    logout.mockResolvedValue(undefined);
    render(<ProfileLogoutSection />);

    fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    fireEvent.press(screen.getByRole("button", { name: "Confirm log out" }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("keeps the dialog open when logout fails", async () => {
    logout.mockRejectedValue(new Error("Storage failure"));
    render(<ProfileLogoutSection />);

    fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    fireEvent.press(screen.getByRole("button", { name: "Confirm log out" }));

    expect(
      await screen.findByText("Could not log out. Please try again."),
    ).toBeTruthy();
    expect(screen.getByText("Log out?")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
