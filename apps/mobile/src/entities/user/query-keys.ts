export const userQueryKeys = {
  all: ["me"] as const,
  profile: () => [...userQueryKeys.all, "profile"] as const,
};
