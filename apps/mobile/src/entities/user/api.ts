import { authClient } from "@/auth";
import type { MeProfile } from "./model";

export function getMeProfile() {
  return authClient.get<MeProfile>("/me/profile");
}
