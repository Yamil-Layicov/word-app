import { useMutation } from "@tanstack/react-query";

import { practiceItemQueryKeys } from "@/entities/practice";
import { reviewQueryKeys } from "@/entities/review";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";
import {
  answerScheduledReview,
  cancelScheduledReview,
  scheduleUserWord,
  startScheduledReviewBox,
} from "./api";
import type {
  AnswerScheduledReviewRequest,
  ScheduledReviewInterval,
  ScheduleUserWordRequest,
} from "./model";
import { scheduledReviewQueryKeys } from "./query-keys";

function invalidateScheduledReviewData() {
  void queryClient.invalidateQueries({ queryKey: scheduledReviewQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: vocabularyItemQueryKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: vocabularyItemQueryKeys.details() });
  void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
  void queryClient.invalidateQueries({ queryKey: practiceItemQueryKeys.lists() });
}

export function useScheduleUserWord() {
  return useMutation({
    mutationFn: (input: ScheduleUserWordRequest) => scheduleUserWord(input),
    onSuccess: invalidateScheduledReviewData,
  });
}

export function useStartScheduledReviewBox() {
  return useMutation({
    mutationFn: (interval: ScheduledReviewInterval) => startScheduledReviewBox(interval),
    onSuccess: invalidateScheduledReviewData,
  });
}

export function useAnswerScheduledReview() {
  return useMutation({
    mutationFn: (input: AnswerScheduledReviewRequest) => answerScheduledReview(input),
    onSuccess: invalidateScheduledReviewData,
  });
}

export function useCancelScheduledReview() {
  return useMutation({
    mutationFn: (scheduleId: string) => cancelScheduledReview(scheduleId),
    onSuccess: invalidateScheduledReviewData,
  });
}
