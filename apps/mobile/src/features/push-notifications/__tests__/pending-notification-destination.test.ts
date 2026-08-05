/// <reference types="jest" />

import {
  consumePendingNotificationDestination,
  savePendingNotificationDestination,
} from "../pending-notification-destination";

const destination = {
  pathname: "/decks/[boxId]" as const,
  params: { boxId: "ONE_DAY" as const },
};

describe("pending notification destination", () => {
  beforeEach(() => {
    consumePendingNotificationDestination();
  });

  it("returns a saved destination exactly once", () => {
    savePendingNotificationDestination(destination);

    expect(consumePendingNotificationDestination()).toEqual(destination);
    expect(consumePendingNotificationDestination()).toBeNull();
  });

  it("keeps only the most recently saved destination", () => {
    savePendingNotificationDestination(destination);
    savePendingNotificationDestination({
      pathname: "/decks/[boxId]",
      params: { boxId: "ONE_WEEK" },
    });

    expect(consumePendingNotificationDestination()).toEqual({
      pathname: "/decks/[boxId]",
      params: { boxId: "ONE_WEEK" },
    });
  });
});
