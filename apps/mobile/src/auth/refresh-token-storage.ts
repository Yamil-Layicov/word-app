import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "word-app.auth.refresh-token";

let cachedRefreshToken: string | null | undefined;
let storageMutationQueue: Promise<void> = Promise.resolve();

export async function getStoredRefreshToken(): Promise<string | null> {
  await storageMutationQueue;

  if (cachedRefreshToken !== undefined) {
    return cachedRefreshToken;
  }

  if (Platform.OS === "web") {
    cachedRefreshToken = null;
    return null;
  }

  cachedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  return cachedRefreshToken;
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await enqueueStorageMutation(async () => {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }

    cachedRefreshToken = refreshToken;
  });
}

export async function clearStoredRefreshToken(): Promise<void> {
  await enqueueStorageMutation(async () => {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }

    cachedRefreshToken = null;
  });
}

function enqueueStorageMutation(operation: () => Promise<void>): Promise<void> {
  const result = storageMutationQueue.then(operation, operation);
  storageMutationQueue = result.catch(() => undefined);

  return result;
}
