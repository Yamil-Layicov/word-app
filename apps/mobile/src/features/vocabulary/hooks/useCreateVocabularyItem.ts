import { useMutation } from "@tanstack/react-query";

import {
  createVocabularyItem,
  vocabularyItemQueryKeys,
  type CreateVocabularyItemRequest,
} from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";

export function useCreateVocabularyItem() {
  return useMutation({
    mutationFn: (input: CreateVocabularyItemRequest) => createVocabularyItem(input),
    onSuccess: (item) => {
      queryClient.setQueryData(vocabularyItemQueryKeys.detail(item.id), item);
      void queryClient.invalidateQueries({ queryKey: vocabularyItemQueryKeys.lists() });
    },
  });
}
