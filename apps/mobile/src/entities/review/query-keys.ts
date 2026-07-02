import type {
  DueReviewsFilters,
  ReviewTimelineFilters,
  ReviewTimelineItemsFilters,
} from "./model";

export const reviewQueryKeys = {
  all: ["reviews"] as const,
  due: () => [...reviewQueryKeys.all, "due"] as const,
  dueList: (filters: DueReviewsFilters = {}) => [...reviewQueryKeys.due(), filters] as const,
  timeline: (filters: ReviewTimelineFilters = {}) =>
    [...reviewQueryKeys.all, "timeline", filters] as const,
  timelineItems: (date: string, filters: ReviewTimelineItemsFilters = {}) =>
    [...reviewQueryKeys.all, "timeline", date, "items", filters] as const,
};
