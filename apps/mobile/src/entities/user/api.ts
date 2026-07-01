import { authClient } from "@/auth";
import type { MeProfile, UpdateMeProfileRequest } from "./model";

export function getMeProfile() {
  return authClient.get<MeProfile>("/me/profile");
}

export function updateMeProfile(input: UpdateMeProfileRequest) {
  return authClient.patch<MeProfile>("/me/profile", input);
}
