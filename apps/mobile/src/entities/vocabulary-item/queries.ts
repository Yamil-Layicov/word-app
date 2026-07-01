import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getVocabularyItem, listVocabularyItems } from "./api";
import type { VocabularyItemsFilters } from "./model";
import { vocabularyItemQueryKeys } from "./query-keys";

type InfiniteVocabularyItemsFilters = Omit<VocabularyItemsFilters, "cursor">;

export function useVocabularyItemsQuery(filters: VocabularyItemsFilters = {}) {
  return useQuery({
    queryKey: vocabularyItemQueryKeys.list(filters),
    queryFn: () => listVocabularyItems(filters),
  });
}

export function useInfiniteVocabularyItemsQuery(filters: InfiniteVocabularyItemsFilters = {}) {
  return useInfiniteQuery({
    queryKey: vocabularyItemQueryKeys.infiniteList(filters),
    queryFn: ({ pageParam }) =>
      listVocabularyItems({
        ...filters,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useVocabularyItemQuery(id: string) {
  return useQuery({
    queryKey: vocabularyItemQueryKeys.detail(id),
    queryFn: () => getVocabularyItem(id),
    enabled: id.length > 0,
  });
}
