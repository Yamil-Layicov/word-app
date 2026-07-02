import { useQuery } from "@tanstack/react-query";

import { getDueReviews, getReviewTimeline, getReviewTimelineItems } from "./api";
import type {
  DueReviewsFilters,
  ReviewTimelineFilters,
  ReviewTimelineItemsFilters,
} from "./model";
import { reviewQueryKeys } from "./query-keys";

export function useDueReviewsQuery(filters: DueReviewsFilters = {}) {
  return useQuery({
    queryKey: reviewQueryKeys.dueList(filters),
    queryFn: () => getDueReviews(filters),
  });
}

export function useReviewTimelineQuery(filters: ReviewTimelineFilters = {}) {
  return useQuery({
    queryKey: reviewQueryKeys.timeline(filters),
    queryFn: () => getReviewTimeline(filters),
  });
}

export function useReviewTimelineItemsQuery(
  date: string,
  filters: ReviewTimelineItemsFilters = {},
) {
  return useQuery({
    queryKey: reviewQueryKeys.timelineItems(date, filters),
    queryFn: () => getReviewTimelineItems(date, filters),
    enabled: date.length > 0,
  });
}
