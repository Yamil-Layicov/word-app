export const userLanguagePairQueryKeys = {
  all: ["me", "languagePairs"] as const,
  list: () => userLanguagePairQueryKeys.all,
};
