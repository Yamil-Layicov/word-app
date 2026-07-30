export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => [...authQueryKeys.all, "me"] as const,
  identities: () => [...authQueryKeys.all, "identities"] as const,
};
