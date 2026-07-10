import { useQuery } from "@tanstack/react-query";

import {
  getScheduledReviewBoxDetail,
  getScheduledReviewBoxes,
  listScheduledReviews,
} from "./api";
import type { ScheduledReviewInterval } from "./model";
import { scheduledReviewQueryKeys } from "./query-keys";

export function useScheduledReviewsQuery() {
  return useQuery({
    queryKey: scheduledReviewQueryKeys.active(),
    queryFn: listScheduledReviews,
  });
}

export function useScheduledReviewBoxesQuery() {
  return useQuery({
    queryKey: scheduledReviewQueryKeys.boxes(),
    queryFn: getScheduledReviewBoxes,
  });
}

export function useScheduledReviewBoxDetailQuery(interval?: ScheduledReviewInterval) {
  return useQuery({
    queryKey: interval
      ? scheduledReviewQueryKeys.box(interval)
      : [...scheduledReviewQueryKeys.boxes(), "missing"],
    queryFn: () => getScheduledReviewBoxDetail(interval as ScheduledReviewInterval),
    enabled: Boolean(interval),
  });
}
