import { useMutation } from "@tanstack/react-query";

import { deckQueryKeys } from "@/entities/deck";
import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import { reviewQueryKeys } from "@/entities/review";
import {
  replaceVocabularyItemContent,
  vocabularyItemQueryKeys,
  type ReplaceVocabularyItemContentRequest,
} from "@/entities/vocabulary-item";
import { scheduledReviewQueryKeys } from "@/features/review-boxes";
import { queryClient } from "@/shared/lib/query-client";

type ReplaceVocabularyItemContentInput = {
  id: string;
  data: ReplaceVocabularyItemContentRequest;
};

export function useReplaceVocabularyItemContent() {
  return useMutation({
    mutationFn: ({ id, data }: ReplaceVocabularyItemContentInput) =>
      replaceVocabularyItemContent(id, data),
    onSuccess: (item) => {
      queryClient.setQueryData(vocabularyItemQueryKeys.detail(item.id), item);
      void queryClient.invalidateQueries({
        queryKey: vocabularyItemQueryKeys.lists(),
      });
      void queryClient.invalidateQueries({ queryKey: deckQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: scheduledReviewQueryKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: practiceItemQueryKeys.lists(),
      });
    },
  });
}
