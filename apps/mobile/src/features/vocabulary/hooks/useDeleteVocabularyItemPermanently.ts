import { useMutation } from "@tanstack/react-query";

import { deckQueryKeys } from "@/entities/deck";
import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import { reviewQueryKeys } from "@/entities/review";
import {
  deleteVocabularyItemPermanently,
  vocabularyItemQueryKeys,
} from "@/entities/vocabulary-item";
import { scheduledReviewQueryKeys } from "@/features/review-boxes";
import { queryClient } from "@/shared/lib/query-client";

export function useDeleteVocabularyItemPermanently() {
  return useMutation({
    mutationFn: (id: string) => deleteVocabularyItemPermanently(id),
    onSuccess: (_response, id) => {
      queryClient.removeQueries({
        exact: true,
        queryKey: vocabularyItemQueryKeys.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: vocabularyItemQueryKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: scheduledReviewQueryKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: deckQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: practiceItemQueryKeys.lists(),
      });
    },
  });
}
