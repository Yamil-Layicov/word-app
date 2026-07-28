import type { ScheduledReviewNotificationDestination } from "./notification-destination";

let pendingDestination: ScheduledReviewNotificationDestination | null = null;

export function savePendingNotificationDestination(
  destination: ScheduledReviewNotificationDestination,
): void {
  pendingDestination = destination;
}

export function consumePendingNotificationDestination(): ScheduledReviewNotificationDestination | null {
  const destination = pendingDestination;

  pendingDestination = null;

  return destination;
}
