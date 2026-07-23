import { authClient } from "@/auth";
import type { RegisterPushTokenRequest } from "./model";

export async function registerPushToken(
  input: RegisterPushTokenRequest,
): Promise<void> {
  await authClient.put<void>("/me/push-tokens", input);
}
