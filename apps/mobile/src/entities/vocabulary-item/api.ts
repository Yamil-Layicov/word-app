import { authClient } from "@/auth";
import type {
  CreateVocabularyItemRequest,
  UpdateVocabularyItemRequest,
  VocabularyItem,
  VocabularyItemsFilters,
  VocabularyItemsResponse,
} from "./model";

export function listVocabularyItems(filters: VocabularyItemsFilters = {}) {
  return authClient.get<VocabularyItemsResponse>("/vocabulary/items", {
    query: filters,
  });
}

export function getVocabularyItem(id: string) {
  return authClient.get<VocabularyItem>(`/vocabulary/items/${id}`);
}

export function createVocabularyItem(input: CreateVocabularyItemRequest) {
  return authClient.post<VocabularyItem>("/vocabulary/items", input);
}

export function updateVocabularyItem(id: string, input: UpdateVocabularyItemRequest) {
  return authClient.patch<VocabularyItem>(`/vocabulary/items/${id}`, input);
}

export function archiveVocabularyItem(id: string) {
  return authClient.delete<VocabularyItem>(`/vocabulary/items/${id}`);
}
