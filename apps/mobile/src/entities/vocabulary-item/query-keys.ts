import type { VocabularyItemsFilters } from "./model";

export const vocabularyItemQueryKeys = {
  all: ["vocabulary", "items"] as const,
  lists: () => [...vocabularyItemQueryKeys.all, "list"] as const,
  list: (filters: VocabularyItemsFilters = {}) =>
    [...vocabularyItemQueryKeys.lists(), filters] as const,
  details: () => [...vocabularyItemQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...vocabularyItemQueryKeys.details(), id] as const,
};
