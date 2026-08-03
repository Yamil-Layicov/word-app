/// <reference types="jest" />

import { authClient } from "@/auth";
import {
  answerScheduledReview,
  cancelScheduledReview,
  getScheduledReviewBoxDetail,
  getScheduledReviewBoxes,
  listScheduledReviews,
  scheduleUserWord,
  startScheduledReviewBox,
} from "../api";
import type {
  AnswerScheduledReviewRequest,
  ScheduleUserWordRequest,
} from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    delete: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

const deleteMock = authClient.delete as jest.Mock;
const getMock = authClient.get as jest.Mock;
const patchMock = authClient.patch as jest.Mock;
const postMock = authClient.post as jest.Mock;

describe("scheduled review boxes API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the current user's active scheduled reviews", async () => {
    const response = { items: [] };
    getMock.mockResolvedValue(response);

    await expect(listScheduledReviews()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/scheduled-reviews");
  });

  it("gets the scheduled review box summaries", async () => {
    const response = { boxes: [] };
    getMock.mockResolvedValue(response);

    await expect(getScheduledReviewBoxes()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/scheduled-reviews/boxes");
  });

  it("gets one scheduled review box by interval", async () => {
    const response = { interval: "ONE_HOUR", items: [] };
    getMock.mockResolvedValue(response);

    await expect(getScheduledReviewBoxDetail("ONE_HOUR")).resolves.toBe(
      response,
    );

    expect(getMock).toHaveBeenCalledWith(
      "/scheduled-reviews/boxes/ONE_HOUR",
    );
  });

  it("schedules a user word with the selected interval", async () => {
    const input: ScheduleUserWordRequest = {
      userWordId: "user-word-1",
      interval: "SIX_HOURS",
    };
    const response = { scheduleId: "schedule-1" };
    postMock.mockResolvedValue(response);

    await expect(scheduleUserWord(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/scheduled-reviews", input);
  });

  it("starts every queued word in the selected interval box", async () => {
    const response = { interval: "SIX_HOURS", items: [] };
    patchMock.mockResolvedValue(response);

    await expect(startScheduledReviewBox("SIX_HOURS")).resolves.toBe(
      response,
    );

    expect(patchMock).toHaveBeenCalledWith(
      "/scheduled-reviews/boxes/SIX_HOURS/start",
    );
  });

  it("answers a review and sends the next interval without the schedule id", async () => {
    const input: AnswerScheduledReviewRequest = {
      scheduleId: "schedule-1",
      practiceMode: "MATCHING",
      result: "CORRECT",
      nextInterval: "ONE_DAY",
    };
    const response = {
      completedScheduleId: "schedule-1",
      result: "CORRECT",
    };
    patchMock.mockResolvedValue(response);

    await expect(answerScheduledReview(input)).resolves.toBe(response);

    expect(patchMock).toHaveBeenCalledWith(
      "/scheduled-reviews/schedule-1/answer",
      {
        practiceMode: "MATCHING",
        result: "CORRECT",
        nextInterval: "ONE_DAY",
      },
    );
  });

  it("answers a known review without sending a next interval", async () => {
    const input: AnswerScheduledReviewRequest = {
      scheduleId: "schedule-1",
      practiceMode: "FLASHCARD",
      result: "KNOWN",
    };
    const response = {
      completedScheduleId: "schedule-1",
      result: "KNOWN",
    };
    patchMock.mockResolvedValue(response);

    await expect(answerScheduledReview(input)).resolves.toBe(response);

    expect(patchMock).toHaveBeenCalledWith(
      "/scheduled-reviews/schedule-1/answer",
      {
        practiceMode: "FLASHCARD",
        result: "KNOWN",
      },
    );
  });

  it("cancels a scheduled review without expecting a response body", async () => {
    deleteMock.mockResolvedValue(undefined);

    await expect(
      cancelScheduledReview("schedule-1"),
    ).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith(
      "/scheduled-reviews/schedule-1",
    );
  });
});
