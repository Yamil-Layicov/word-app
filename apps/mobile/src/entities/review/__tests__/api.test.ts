/// <reference types="jest" />

import { authClient } from "@/auth";
import {
  answerReview,
  getDueReviews,
  getReviewTimeline,
  getReviewTimelineItems,
} from "../api";
import type {
  AnswerReviewRequest,
  DueReviewsFilters,
  ReviewTimelineFilters,
  ReviewTimelineItemsFilters,
} from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const getMock = authClient.get as jest.Mock;
const postMock = authClient.post as jest.Mock;

describe("review API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets due reviews with an empty query by default", async () => {
    const response = { items: [] };
    getMock.mockResolvedValue(response);

    await expect(getDueReviews()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/reviews/due", {
      query: {},
    });
  });

  it("forwards the due-review limit", async () => {
    const filters: DueReviewsFilters = { limit: 25 };

    await getDueReviews(filters);

    expect(getMock).toHaveBeenCalledWith("/reviews/due", {
      query: filters,
    });
  });

  it("gets the review timeline with an empty query by default", async () => {
    const response = { groups: [] };
    getMock.mockResolvedValue(response);

    await expect(getReviewTimeline()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/reviews/timeline", {
      query: {},
    });
  });

  it("forwards every supported review-timeline filter", async () => {
    const filters: ReviewTimelineFilters = {
      timeZone: "Asia/Baku",
      days: 30,
    };

    await getReviewTimeline(filters);

    expect(getMock).toHaveBeenCalledWith("/reviews/timeline", {
      query: filters,
    });
  });

  it("gets timeline items for a date with an empty query by default", async () => {
    const response = {
      date: "2026-08-03",
      totalWords: 0,
      dueWords: 0,
      items: [],
    };
    getMock.mockResolvedValue(response);

    await expect(getReviewTimelineItems("2026-08-03")).resolves.toBe(
      response,
    );

    expect(getMock).toHaveBeenCalledWith(
      "/reviews/timeline/2026-08-03/items",
      { query: {} },
    );
  });

  it("forwards the timezone when getting timeline items", async () => {
    const filters: ReviewTimelineItemsFilters = {
      timeZone: "Asia/Baku",
    };

    await getReviewTimelineItems("2026-08-03", filters);

    expect(getMock).toHaveBeenCalledWith(
      "/reviews/timeline/2026-08-03/items",
      { query: filters },
    );
  });

  it("submits a review answer with the complete request body", async () => {
    const input: AnswerReviewRequest = {
      userWordId: "user-word-1",
      rating: "GOOD",
      isCorrect: true,
    };
    const response = { userWordId: "user-word-1" };
    postMock.mockResolvedValue(response);

    await expect(answerReview(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/reviews/answer", input);
  });
});
