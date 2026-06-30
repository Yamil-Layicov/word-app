import { useQuery } from "@tanstack/react-query";

import { listCountries, listLanguages, listLanguagePairs } from "./api";
import { lookupQueryKeys } from "./query-keys";

export function useCountriesQuery() {
  return useQuery({
    queryKey: lookupQueryKeys.countries(),
    queryFn: listCountries,
  });
}

export function useLanguagesQuery() {
  return useQuery({
    queryKey: lookupQueryKeys.languages(),
    queryFn: listLanguages,
  });
}

export function useLanguagePairsQuery() {
  return useQuery({
    queryKey: lookupQueryKeys.languagePairs(),
    queryFn: listLanguagePairs,
  });
}
