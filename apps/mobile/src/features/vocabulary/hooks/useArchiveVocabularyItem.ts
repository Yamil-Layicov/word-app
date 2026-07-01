import { useMutation } from "@tanstack/react-query";

import { archiveVocabularyItem, vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";

export function useArchiveVocabularyItem() {
  return useMutation({
    mutationFn: (id: string) => archiveVocabularyItem(id),
    onSuccess: (item) => {
      queryClient.setQueryData(vocabularyItemQueryKeys.detail(item.id), item);
      void queryClient.invalidateQueries({ queryKey: vocabularyItemQueryKeys.lists() });
    },
  });
}
