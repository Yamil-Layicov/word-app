import { useMutation } from "@tanstack/react-query";

import { answerPractice, practiceItemQueryKeys, type AnswerPracticeRequest } from "@/entities/practice";
import { queryClient } from "@/shared/lib/query-client";

export function useAnswerPractice() {
  return useMutation({
    mutationFn: (input: AnswerPracticeRequest) => answerPractice(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: practiceItemQueryKeys.lists() });
    },
  });
}
