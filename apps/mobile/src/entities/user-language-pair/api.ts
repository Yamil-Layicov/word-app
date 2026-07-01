import { authClient } from "@/auth";
import type { UserLanguagePair } from "./model";

export function listMeLanguagePairs() {
  return authClient.get<UserLanguagePair[]>("/me/language-pairs");
}
