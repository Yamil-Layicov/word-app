import { authClient } from "@/auth";
import type { MeProfile, SetActiveLanguagePairRequest, UpdateMeProfileRequest } from "./model";

export function getMeProfile() {
  return authClient.get<MeProfile>("/me/profile");
}

export function updateMeProfile(input: UpdateMeProfileRequest) {
  return authClient.patch<MeProfile>("/me/profile", input);
}

export function setActiveLanguagePair(input: SetActiveLanguagePairRequest) {
  return authClient.patch<MeProfile>("/me/active-language-pair", input);
}
