import { useQuery } from "@tanstack/react-query";

import { getVocabularyItem, listVocabularyItems } from "./api";
import type { VocabularyItemsFilters } from "./model";
import { vocabularyItemQueryKeys } from "./query-keys";

export function useVocabularyItemsQuery(filters: VocabularyItemsFilters = {}) {
  return useQuery({
    queryKey: vocabularyItemQueryKeys.list(filters),
    queryFn: () => listVocabularyItems(filters),
  });
}

export function useVocabularyItemQuery(id: string) {
  return useQuery({
    queryKey: vocabularyItemQueryKeys.detail(id),
    queryFn: () => getVocabularyItem(id),
    enabled: id.length > 0,
  });
}
