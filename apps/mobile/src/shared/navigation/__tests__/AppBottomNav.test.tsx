/// <reference types="jest" />

import { fireEvent, render, screen } from "@testing-library/react-native";
import { usePathname, useRouter } from "expo-router";

import { AppBottomNav } from "../AppBottomNav";

jest.mock("expo-router", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

const usePathnameMock = jest.mocked(usePathname);
const useRouterMock = jest.mocked(useRouter);
const push = jest.fn();

describe("AppBottomNav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue("/");
    useRouterMock.mockReturnValue({ push } as never);
  });

  it("opens My Vocabulary from Study", () => {
    render(<AppBottomNav />);

    fireEvent.press(screen.getByRole("button", { name: "Study" }));

    expect(push).toHaveBeenCalledWith("/vocabulary");
  });

  it("opens the Progress placeholder from Progress", () => {
    render(<AppBottomNav />);

    fireEvent.press(screen.getByRole("button", { name: "Progress" }));

    expect(push).toHaveBeenCalledWith("/progress");
  });
});
