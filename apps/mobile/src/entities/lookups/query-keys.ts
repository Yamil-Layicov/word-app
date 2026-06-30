export const lookupQueryKeys = {
  all: ["lookups"] as const,
  countries: () => [...lookupQueryKeys.all, "countries"] as const,
  languages: () => [...lookupQueryKeys.all, "languages"] as const,
  languagePairs: () => [...lookupQueryKeys.all, "languagePairs"] as const,
};
