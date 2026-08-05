/// <reference types="jest" />

import { act, render } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";

import { getAccessToken } from "@/auth";
import { NotificationNavigationObserver } from "../NotificationNavigationObserver";
import { savePendingNotificationDestination } from "../pending-notification-destination";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
  addNotificationResponseReceivedListener: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  getLastNotificationResponse: jest.fn(),
}));

jest.mock("@/auth", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("../pending-notification-destination", () => ({
  savePendingNotificationDestination: jest.fn(),
}));

const mockUseRouter = jest.mocked(useRouter);
const mockAddResponseListener = jest.mocked(
  Notifications.addNotificationResponseReceivedListener,
);
const mockClearLastResponse = jest.mocked(
  Notifications.clearLastNotificationResponse,
);
const mockGetLastResponse = jest.mocked(
  Notifications.getLastNotificationResponse,
);
const mockGetAccessToken = jest.mocked(getAccessToken);
const mockSavePendingDestination = jest.mocked(
  savePendingNotificationDestination,
);

const router = {
  push: jest.fn(),
  replace: jest.fn(),
};
const removeSubscription = jest.fn();
let responseListener:
  | ((response: Notifications.NotificationResponse) => void)
  | undefined;

describe("NotificationNavigationObserver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    responseListener = undefined;
    setPlatform("android");
    mockUseRouter.mockReturnValue(router as never);
    mockGetAccessToken.mockReturnValue("access-token");
    mockGetLastResponse.mockReturnValue(null);
    mockAddResponseListener.mockImplementation((listener) => {
      responseListener = listener;
      return { remove: removeSubscription };
    });
  });

  it("opens the scheduled review box for an authenticated user", () => {
    render(<NotificationNavigationObserver />);

    act(() => {
      responseListener?.(createResponse());
    });

    expect(mockClearLastResponse).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/[boxId]",
      params: { boxId: "ONE_HOUR" },
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("saves the destination and opens login when no session exists", () => {
    mockGetAccessToken.mockReturnValue(null);
    render(<NotificationNavigationObserver />);

    act(() => {
      responseListener?.(createResponse());
    });

    expect(mockSavePendingDestination).toHaveBeenCalledWith({
      pathname: "/decks/[boxId]",
      params: { boxId: "ONE_HOUR" },
    });
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("handles the same notification response only once", () => {
    const response = createResponse({ identifier: "same-response" });
    render(<NotificationNavigationObserver />);

    act(() => {
      responseListener?.(response);
      responseListener?.(response);
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(mockClearLastResponse).toHaveBeenCalledTimes(1);
  });

  it("ignores custom actions and unsupported payloads", () => {
    render(<NotificationNavigationObserver />);

    act(() => {
      responseListener?.(
        createResponse({ actionIdentifier: "dismiss" }),
      );
      responseListener?.(
        createResponse({
          data: { type: "other", interval: "ONE_HOUR" },
          identifier: "unsupported-response",
        }),
      );
    });

    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockClearLastResponse).not.toHaveBeenCalled();
  });

  it("handles the last notification response during startup", () => {
    mockGetLastResponse.mockReturnValue(
      createResponse({ identifier: "startup-response" }),
    );

    render(<NotificationNavigationObserver />);

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/[boxId]",
      params: { boxId: "ONE_HOUR" },
    });
  });

  it("removes the native listener when the observer unmounts", () => {
    const view = render(<NotificationNavigationObserver />);

    view.unmount();

    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe on web", () => {
    setPlatform("web");

    render(<NotificationNavigationObserver />);

    expect(mockGetLastResponse).not.toHaveBeenCalled();
    expect(mockAddResponseListener).not.toHaveBeenCalled();
  });
});

type ResponseOverrides = {
  actionIdentifier?: string;
  data?: Record<string, unknown>;
  identifier?: string;
};

function createResponse(
  overrides: ResponseOverrides = {},
): Notifications.NotificationResponse {
  return {
    actionIdentifier:
      overrides.actionIdentifier ?? Notifications.DEFAULT_ACTION_IDENTIFIER,
    notification: {
      date: Date.now(),
      request: {
        content: {
          autoDismiss: true,
          badge: null,
          body: "Review words",
          data:
            overrides.data ?? {
              type: "scheduled-review-due",
              interval: "ONE_HOUR",
            },
          sound: null,
          sticky: false,
          subtitle: null,
          title: "Review due",
        },
        identifier: overrides.identifier ?? "response-1",
        trigger: null,
      },
    },
    userText: null,
  } as unknown as Notifications.NotificationResponse;
}

function setPlatform(value: string) {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value,
  });
}
