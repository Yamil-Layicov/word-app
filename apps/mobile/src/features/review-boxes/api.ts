import { authClient } from "@/auth";
import type {
  AnswerScheduledReviewRequest,
  AnswerScheduledReviewResponse,
  ScheduledReviewBoxDetailResponse,
  ScheduledReviewBoxesResponse,
  ScheduledReviewInterval,
  ScheduledReviewItem,
  ScheduledReviewItemsResponse,
  ScheduleUserWordRequest,
} from "./model";

export function listScheduledReviews() {
  return authClient.get<ScheduledReviewItemsResponse>("/scheduled-reviews");
}

export function getScheduledReviewBoxes() {
  return authClient.get<ScheduledReviewBoxesResponse>("/scheduled-reviews/boxes");
}

export function getScheduledReviewBoxDetail(interval: ScheduledReviewInterval) {
  return authClient.get<ScheduledReviewBoxDetailResponse>(`/scheduled-reviews/boxes/${interval}`);
}

export function scheduleUserWord(input: ScheduleUserWordRequest) {
  return authClient.post<ScheduledReviewItem>("/scheduled-reviews", input);
}

export function startScheduledReviewBox(interval: ScheduledReviewInterval) {
  return authClient.patch<ScheduledReviewBoxDetailResponse>(`/scheduled-reviews/boxes/${interval}/start`);
}

export function answerScheduledReview(input: AnswerScheduledReviewRequest) {
  return authClient.patch<AnswerScheduledReviewResponse>(
    `/scheduled-reviews/${input.scheduleId}/answer`,
    { quality: input.quality },
  );
}

export function cancelScheduledReview(scheduleId: string) {
  return authClient.delete<void>(`/scheduled-reviews/${scheduleId}`);
}
