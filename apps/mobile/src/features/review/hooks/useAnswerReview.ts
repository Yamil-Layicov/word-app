import { useMutation } from "@tanstack/react-query";

import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import {
  answerReview,
  reviewQueryKeys,
  type AnswerReviewRequest,
} from "@/entities/review";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";

export function useAnswerReview() {
  return useMutation({
    mutationFn: (input: AnswerReviewRequest) => answerReview(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: practiceItemQueryKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: vocabularyItemQueryKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: masteredCollectionQueryKeys.all,
      });
    },
  });
}
