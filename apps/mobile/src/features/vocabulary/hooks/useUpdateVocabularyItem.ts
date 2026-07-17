import { useMutation } from "@tanstack/react-query";

import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import {
  updateVocabularyItem,
  vocabularyItemQueryKeys,
  type UpdateVocabularyItemRequest,
} from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";

type UpdateVocabularyItemInput = {
  id: string;
  data: UpdateVocabularyItemRequest;
};

export function useUpdateVocabularyItem() {
  return useMutation({
    mutationFn: ({ id, data }: UpdateVocabularyItemInput) =>
      updateVocabularyItem(id, data),
    onSuccess: (item) => {
      queryClient.setQueryData(vocabularyItemQueryKeys.detail(item.id), item);
      void queryClient.invalidateQueries({
        queryKey: vocabularyItemQueryKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.all,
      });
    },
  });
}
