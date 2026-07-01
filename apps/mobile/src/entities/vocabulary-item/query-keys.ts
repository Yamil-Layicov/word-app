import type { VocabularyItemsFilters } from "./model";

export const vocabularyItemQueryKeys = {
  all: ["vocabulary", "items"] as const,
  lists: () => [...vocabularyItemQueryKeys.all, "list"] as const,
  list: (filters: VocabularyItemsFilters = {}) =>
    [...vocabularyItemQueryKeys.lists(), filters] as const,
  infiniteList: (filters: Omit<VocabularyItemsFilters, "cursor"> = {}) =>
    [...vocabularyItemQueryKeys.lists(), "infinite", filters] as const,
  details: () => [...vocabularyItemQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...vocabularyItemQueryKeys.details(), id] as const,
};
