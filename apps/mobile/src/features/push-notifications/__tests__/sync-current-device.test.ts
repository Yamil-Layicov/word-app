/// <reference types="jest" />

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken } from "../api";
import { syncCurrentDevicePushToken } from "../sync-current-device";

const mockDeviceState = { isDevice: true };

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    easConfig: { projectId: "project-1" },
    executionEnvironment: "standalone",
    expoConfig: null,
  },
  ExecutionEnvironment: {
    StoreClient: "store-client",
  },
}));

jest.mock("expo-device", () => ({
  get isDevice() {
    return mockDeviceState.isDevice;
  },
}));

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock("../api", () => ({
  registerPushToken: jest.fn(),
}));

const mockGetExpoPushToken = jest.mocked(
  Notifications.getExpoPushTokenAsync,
);
const mockGetPermissions = jest.mocked(Notifications.getPermissionsAsync);
const mockRequestPermissions = jest.mocked(
  Notifications.requestPermissionsAsync,
);
const mockSetNotificationChannel = jest.mocked(
  Notifications.setNotificationChannelAsync,
);
const mockRegisterPushToken = jest.mocked(registerPushToken);

describe("syncCurrentDevicePushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("android");
    setPhysicalDevice(true);
    setExecutionEnvironment("standalone");
    setProjectConfig("project-1", undefined);
    mockGetPermissions.mockResolvedValue({
      status: "granted",
    } as Notifications.NotificationPermissionsStatus);
    mockGetExpoPushToken.mockResolvedValue({
      data: "ExponentPushToken[test]",
      type: "expo",
    });
    mockRegisterPushToken.mockResolvedValue({} as never);
  });

  it("configures Android, obtains a token, and registers it with the API", async () => {
    await syncCurrentDevicePushToken();

    expect(mockSetNotificationChannel).toHaveBeenCalledWith(
      "review-reminders",
      {
        name: "Review reminders",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF641F",
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      },
    );
    expect(mockGetExpoPushToken).toHaveBeenCalledWith({
      projectId: "project-1",
    });
    expect(mockRegisterPushToken).toHaveBeenCalledWith({
      token: "ExponentPushToken[test]",
      platform: "ANDROID",
    });
  });

  it("requests permission when the device can ask again", async () => {
    mockGetPermissions.mockResolvedValue({
      status: "undetermined",
      canAskAgain: true,
    } as Notifications.NotificationPermissionsStatus);
    mockRequestPermissions.mockResolvedValue({
      status: "granted",
    } as Notifications.NotificationPermissionsStatus);

    await syncCurrentDevicePushToken();

    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockRegisterPushToken).toHaveBeenCalledTimes(1);
  });

  it("stops when notification permission cannot be requested", async () => {
    mockGetPermissions.mockResolvedValue({
      status: "denied",
      canAskAgain: false,
    } as Notifications.NotificationPermissionsStatus);

    await syncCurrentDevicePushToken();

    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });

  it("registers iOS without configuring an Android channel", async () => {
    setPlatform("ios");

    await syncCurrentDevicePushToken();

    expect(mockSetNotificationChannel).not.toHaveBeenCalled();
    expect(mockRegisterPushToken).toHaveBeenCalledWith({
      token: "ExponentPushToken[test]",
      platform: "IOS",
    });
  });

  it.each([
    ["web", true, "standalone"],
    ["android", false, "standalone"],
    ["android", true, ExecutionEnvironment.StoreClient],
  ] as const)(
    "skips unsupported environment platform=%s device=%s environment=%s",
    async (platform, isDevice, executionEnvironment) => {
      setPlatform(platform);
      setPhysicalDevice(isDevice);
      setExecutionEnvironment(executionEnvironment);

      await syncCurrentDevicePushToken();

      expect(mockGetPermissions).not.toHaveBeenCalled();
      expect(mockGetExpoPushToken).not.toHaveBeenCalled();
      expect(mockRegisterPushToken).not.toHaveBeenCalled();
    },
  );

  it("falls back to the Expo config project ID", async () => {
    setProjectConfig(undefined, "fallback-project");

    await syncCurrentDevicePushToken();

    expect(mockGetExpoPushToken).toHaveBeenCalledWith({
      projectId: "fallback-project",
    });
  });

  it("fails clearly when no EAS project ID is configured", async () => {
    setProjectConfig(undefined, undefined);

    await expect(syncCurrentDevicePushToken()).rejects.toThrow(
      "EAS project ID is not configured",
    );
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });
});

function setPlatform(value: string) {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value,
  });
}

function setPhysicalDevice(value: boolean) {
  mockDeviceState.isDevice = value;
}

function setExecutionEnvironment(value: string) {
  Object.assign(Constants, { executionEnvironment: value });
}

function setProjectConfig(
  easProjectId: string | undefined,
  expoProjectId: string | undefined,
) {
  Object.assign(Constants, {
    easConfig: easProjectId ? { projectId: easProjectId } : null,
    expoConfig: expoProjectId
      ? { extra: { eas: { projectId: expoProjectId } } }
      : null,
  });
}
