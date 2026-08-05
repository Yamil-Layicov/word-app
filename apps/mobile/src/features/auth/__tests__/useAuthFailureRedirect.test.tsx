/// <reference types="jest" />

import { renderHook, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/shared/api/http-error";
import { useAuthFailureRedirect } from "../hooks/useAuthFailureRedirect";
import { useLogout } from "../hooks/useLogout";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../hooks/useLogout", () => ({
  useLogout: jest.fn(),
}));

const mockUseRouter = jest.mocked(useRouter);
const mockUseLogout = jest.mocked(useLogout);
const logout = jest.fn();
const replace = jest.fn();

describe("useAuthFailureRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logout.mockResolvedValue(undefined);
    mockUseLogout.mockReturnValue(logout);
    mockUseRouter.mockReturnValue({ replace } as never);
  });

  it("ends only the local session and redirects on an unauthorized error", async () => {
    const error = new ApiError({
      status: 401,
      message: "Unauthorized",
    });

    const { result } = renderHook(() => useAuthFailureRedirect(error));

    expect(result.current).toBe(true);
    await waitFor(() => {
      expect(logout).toHaveBeenCalledWith({ revokeServerSession: false });
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it.each([
    null,
    new Error("Network unavailable"),
    new ApiError({ status: 500, message: "Server error" }),
  ])("does not redirect for a non-authentication error", (error) => {
    const { result } = renderHook(() => useAuthFailureRedirect(error));

    expect(result.current).toBe(false);
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
