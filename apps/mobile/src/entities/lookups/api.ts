import { baseClient } from "@/shared/api/base-client";
import type { Country, Language, LanguagePair } from "./model";

export function listCountries() {
  return baseClient.get<Country[]>("/countries");
}

export function listLanguages() {
  return baseClient.get<Language[]>("/languages");
}

export function listLanguagePairs() {
  return baseClient.get<LanguagePair[]>("/language-pairs");
}
