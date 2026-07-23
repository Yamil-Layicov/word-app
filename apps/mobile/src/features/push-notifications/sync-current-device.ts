import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken } from "./api";
import type { PushPlatform } from "./model";

const REVIEW_REMINDERS_CHANNEL_ID = "review-reminders";

export async function syncCurrentDevicePushToken(): Promise<void> {
  if (!isSupportedNativeDevice()) {
    return;
  }

  if (Platform.OS === "android") {
    await configureAndroidChannel();
  }

  const permissionGranted = await ensureNotificationPermission();

  if (!permissionGranted) {
    return;
  }

  const projectId = getEasProjectId();
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  await registerPushToken({
    token: token.data,
    platform: toPushPlatform(Platform.OS),
  });
}

function isSupportedNativeDevice(): boolean {
  return (
    (Platform.OS === "android" || Platform.OS === "ios") &&
    Device.isDevice &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

async function configureAndroidChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(REVIEW_REMINDERS_CHANNEL_ID, {
    name: "Review reminders",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#FF641F",
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function ensureNotificationPermission(): Promise<boolean> {
  const currentPermission = await Notifications.getPermissionsAsync();

  if (currentPermission.status === "granted") {
    return true;
  }

  if (!currentPermission.canAskAgain) {
    return false;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();

  return requestedPermission.status === "granted";
}

function getEasProjectId(): string {
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

  if (!projectId) {
    throw new Error("EAS project ID is not configured");
  }

  return projectId;
}

function toPushPlatform(platform: typeof Platform.OS): PushPlatform {
  if (platform === "android") {
    return "ANDROID";
  }

  if (platform === "ios") {
    return "IOS";
  }

  throw new Error(`Unsupported push notification platform: ${platform}`);
}
