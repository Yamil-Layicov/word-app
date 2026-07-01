import type { PracticeItemsFilters } from "./model";

export const practiceItemQueryKeys = {
  all: ["practice", "items"] as const,
  lists: () => [...practiceItemQueryKeys.all, "list"] as const,
  list: (filters: PracticeItemsFilters = {}) => [...practiceItemQueryKeys.lists(), filters] as const,
  infiniteList: (filters: Omit<PracticeItemsFilters, "cursor"> = {}) =>
    [...practiceItemQueryKeys.lists(), "infinite", filters] as const,
};
