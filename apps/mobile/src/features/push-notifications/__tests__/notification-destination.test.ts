/// <reference types="jest" />

import { getNotificationDestination } from "../notification-destination";

describe("getNotificationDestination", () => {
  it.each([
    "ONE_HOUR",
    "SIX_HOURS",
    "ONE_DAY",
    "THREE_DAYS",
    "ONE_WEEK",
  ] as const)("routes the %s scheduled-review notification", (interval) => {
    expect(
      getNotificationDestination({
        type: "scheduled-review-due",
        interval,
      }),
    ).toEqual({
      pathname: "/decks/[boxId]",
      params: { boxId: interval },
    });
  });

  it.each([
    null,
    undefined,
    "scheduled-review-due",
    {},
    { type: "other", interval: "ONE_HOUR" },
    { type: "scheduled-review-due" },
    { type: "scheduled-review-due", interval: "TWO_DAYS" },
  ])("ignores unsupported payload %#", (payload) => {
    expect(getNotificationDestination(payload)).toBeNull();
  });
});
