/// <reference types="jest" />

import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { useVocabularyItemsQuery } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useScheduledReviewBoxesQuery,
  useStartScheduledReviewBox,
} from "@/features/review-boxes";
import { ReviewBoxesScreen } from "../ReviewBoxesScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/vocabulary-item", () => ({
  useVocabularyItemsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useScheduledReviewBoxesQuery: jest.fn(),
  useStartScheduledReviewBox: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useVocabularyItemsQueryMock = useVocabularyItemsQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useScheduledReviewBoxesQueryMock =
  useScheduledReviewBoxesQuery as jest.Mock;
const useStartScheduledReviewBoxMock =
  useStartScheduledReviewBox as jest.Mock;

const router = {
  push: jest.fn(),
};
const refetchVocabulary = jest.fn();
const refetchScheduledBoxes = jest.fn();
const startScheduledReviewBox = jest.fn();

describe("ReviewBoxesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useVocabularyItemsQueryMock.mockReturnValue({
      data: {
        items: [],
        nextCursor: null,
      },
      error: null,
      isError: false,
      refetch: refetchVocabulary,
    });
    useScheduledReviewBoxesQueryMock.mockReturnValue({
      data: {
        boxes: [],
      },
      error: null,
      isError: false,
      refetch: refetchScheduledBoxes,
    });
    useStartScheduledReviewBoxMock.mockReturnValue({
      error: null,
      isPending: false,
      mutate: startScheduledReviewBox,
    });
  });

  it("renders the five interval boxes and the mastered box when empty", () => {
    render(<ReviewBoxesScreen />);

    expect(screen.getByText("1 hour")).toBeTruthy();
    expect(screen.getByText("6 hours")).toBeTruthy();
    expect(screen.getByText("1 day")).toBeTruthy();
    expect(screen.getByText("3 days")).toBeTruthy();
    expect(screen.getByText("1 week")).toBeTruthy();
    expect(screen.getByText("Mastered Words")).toBeTruthy();
    expect(screen.getAllByText("Empty")).toHaveLength(6);
  });

  it("starts a queued box with the matching API interval", () => {
    useScheduledReviewBoxesQueryMock.mockReturnValue({
      data: {
        boxes: [
          {
            interval: "ONE_HOUR",
            label: "1 hour",
            totalWords: 2,
            queuedWords: 2,
            startedWords: 0,
            dueWords: 0,
            nextDueAt: null,
          },
        ],
      },
      error: null,
      isError: false,
      refetch: refetchScheduledBoxes,
    });
    render(<ReviewBoxesScreen />);

    expect(screen.getByText("2 words")).toBeTruthy();
    expect(screen.getByText("2 queued. Start when ready.")).toBeTruthy();

    fireEvent.press(screen.getByText("Start"));

    expect(startScheduledReviewBox).toHaveBeenCalledTimes(1);
    expect(startScheduledReviewBox).toHaveBeenCalledWith("ONE_HOUR");
  });

  it("opens the detail route for a non-empty interval box", () => {
    useScheduledReviewBoxesQueryMock.mockReturnValue({
      data: {
        boxes: [
          {
            interval: "SIX_HOURS",
            label: "6 hours",
            totalWords: 1,
            queuedWords: 1,
            startedWords: 0,
            dueWords: 0,
            nextDueAt: null,
          },
        ],
      },
      error: null,
      isError: false,
      refetch: refetchScheduledBoxes,
    });
    render(<ReviewBoxesScreen />);

    fireEvent.press(screen.getByText("6 hours"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/[boxId]",
      params: {
        boxId: "SIX_HOURS",
      },
    });
  });
});
