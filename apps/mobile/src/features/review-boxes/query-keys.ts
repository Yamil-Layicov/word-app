import type { ScheduledReviewInterval } from "./model";

export const scheduledReviewQueryKeys = {
  all: ["scheduled-reviews"] as const,
  active: () => [...scheduledReviewQueryKeys.all, "active"] as const,
  boxes: () => [...scheduledReviewQueryKeys.all, "boxes"] as const,
  box: (interval: ScheduledReviewInterval) =>
    [...scheduledReviewQueryKeys.boxes(), interval] as const,
};
