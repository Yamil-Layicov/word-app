import { useMutation } from "@tanstack/react-query";

import { archiveVocabularyItem, vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";

export function useArchiveVocabularyItem() {
  return useMutation({
    mutationFn: (id: string) => archiveVocabularyItem(id),
    onSuccess: (_response, id) => {
      queryClient.removeQueries({
        queryKey: vocabularyItemQueryKeys.detail(id),
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: vocabularyItemQueryKeys.lists() });
    },
  });
}
