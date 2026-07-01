import { authClient } from "@/auth";
import type { VocabularyItem, VocabularyItemsFilters, VocabularyItemsResponse } from "./model";

export function listVocabularyItems(filters: VocabularyItemsFilters = {}) {
  return authClient.get<VocabularyItemsResponse>("/vocabulary/items", {
    query: filters,
  });
}

export function getVocabularyItem(id: string) {
  return authClient.get<VocabularyItem>(`/vocabulary/items/${id}`);
}
