import {
  parseScheduledReviewInterval,
  type ScheduledReviewInterval,
} from "@/features/review-boxes";

export type ScheduledReviewNotificationDestination = {
  pathname: "/decks/[boxId]";
  params: {
    boxId: ScheduledReviewInterval;
  };
};

export function getNotificationDestination(
  data: unknown,
): ScheduledReviewNotificationDestination | null {
  if (!isRecord(data) || data.type !== "scheduled-review-due") {
    return null;
  }

  const interval = parseScheduledReviewInterval(data.interval);

  if (!interval) {
    return null;
  }

  return {
    pathname: "/decks/[boxId]",
    params: {
      boxId: interval,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
