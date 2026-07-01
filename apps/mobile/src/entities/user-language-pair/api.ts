import { authClient } from "@/auth";
import type { AddMeLanguagePairRequest, UserLanguagePair } from "./model";

export function listMeLanguagePairs() {
  return authClient.get<UserLanguagePair[]>("/me/language-pairs");
}

export function addMeLanguagePair(input: AddMeLanguagePairRequest) {
  return authClient.post<UserLanguagePair[]>("/me/language-pairs", input);
}
