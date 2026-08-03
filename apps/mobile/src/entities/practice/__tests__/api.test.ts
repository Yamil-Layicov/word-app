/// <reference types="jest" />

import { authClient } from "@/auth";
import { answerPractice, listPracticeItems } from "../api";
import type {
  AnswerPracticeRequest,
  PracticeItemsFilters,
} from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const getMock = authClient.get as jest.Mock;
const postMock = authClient.post as jest.Mock;

describe("practice API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists practice items with an empty query by default", async () => {
    const response = { items: [], nextCursor: null };
    getMock.mockResolvedValue(response);

    await expect(listPracticeItems()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/practice/items", {
      query: {},
    });
  });

  it("forwards every supported practice-item filter", async () => {
    const filters: PracticeItemsFilters = {
      status: "REVIEWING",
      isFavorite: true,
      search: "travel",
      limit: 25,
      cursor: "cursor-1",
    };

    await listPracticeItems(filters);

    expect(getMock).toHaveBeenCalledWith("/practice/items", {
      query: filters,
    });
  });

  it("submits a practice answer with the complete request body", async () => {
    const input: AnswerPracticeRequest = {
      userWordId: "user-word-1",
      isCorrect: true,
      practiceMode: "MATCHING",
    };
    const response = { userWordId: "user-word-1" };
    postMock.mockResolvedValue(response);

    await expect(answerPractice(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/practice/answer", input);
  });
});
