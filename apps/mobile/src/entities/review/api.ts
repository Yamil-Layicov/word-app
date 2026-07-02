import { authClient } from "@/auth";

import type {
  AnswerReviewRequest,
  AnswerReviewResponse,
  DueReviewsFilters,
  DueReviewsResponse,
  ReviewTimelineFilters,
  ReviewTimelineItemsFilters,
  ReviewTimelineItemsResponse,
  ReviewTimelineResponse,
} from "./model";

export function getDueReviews(filters: DueReviewsFilters = {}) {
  return authClient.get<DueReviewsResponse>("/reviews/due", {
    query: filters,
  });
}

export function getReviewTimeline(filters: ReviewTimelineFilters = {}) {
  return authClient.get<ReviewTimelineResponse>("/reviews/timeline", {
    query: filters,
  });
}

export function getReviewTimelineItems(
  date: string,
  filters: ReviewTimelineItemsFilters = {},
) {
  return authClient.get<ReviewTimelineItemsResponse>(`/reviews/timeline/${date}/items`, {
    query: filters,
  });
}

export function answerReview(input: AnswerReviewRequest) {
  return authClient.post<AnswerReviewResponse>("/reviews/answer", input);
}
