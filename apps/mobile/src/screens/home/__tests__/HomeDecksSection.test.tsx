/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { useDecksQuery, type DeckSummary } from "@/entities/deck";
import { useAuthFailureRedirect } from "@/features/auth";
import { useCreateDeck } from "@/features/decks";
import { HomeDecksSection } from "../HomeDecksSection";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/deck", () => ({
  useDecksQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/decks", () => ({
  useCreateDeck: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useDecksQueryMock = useDecksQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useCreateDeckMock = useCreateDeck as jest.Mock;

const router = {
  push: jest.fn(),
};
const createDeck = jest.fn();
const refetchDecks = jest.fn();

const deck = createDeckSummary();

describe("HomeDecksSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createDeck.mockReset().mockResolvedValue(deck);
    refetchDecks.mockReset().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue(router);
    useDecksQueryMock.mockReturnValue(createDecksQuery([deck]));
    useAuthFailureRedirectMock.mockReturnValue(false);
    useCreateDeckMock.mockReturnValue(createMutation(createDeck));
  });

  it("shows the loading state while the deck query is pending", () => {
    useDecksQueryMock.mockReturnValue(
      createDecksQuery([], { isLoading: true }),
    );

    render(<HomeDecksSection />);

    expect(screen.getByText("Loading decks...")).toBeTruthy();
    expect(screen.queryByText("No decks created yet.")).toBeNull();
  });

  it("retries a failed deck query", () => {
    useDecksQueryMock.mockReturnValue(
      createDecksQuery([], {
        error: new Error("Network unavailable"),
        isError: true,
      }),
    );

    render(<HomeDecksSection />);

    expect(screen.getByText("Could not load your decks.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchDecks).toHaveBeenCalledTimes(1);
  });

  it("leaves unauthorized query errors to the auth redirect flow", () => {
    useDecksQueryMock.mockReturnValue(
      createDecksQuery([], {
        error: new Error("Unauthorized"),
        isError: true,
      }),
    );
    useAuthFailureRedirectMock.mockReturnValue(true);

    render(<HomeDecksSection />);

    expect(screen.queryByText("Could not load your decks.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("renders deck progress and opens the selected deck", () => {
    render(<HomeDecksSection />);

    expect(screen.getByText("Travel words")).toBeTruthy();
    expect(screen.getByText("3 words - Default")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();

    fireEvent.press(screen.getByText("Travel words"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/category/[deckId]",
      params: { deckId: "deck-1" },
    });
  });

  it("filters decks locally and restores the list when search is cleared", () => {
    render(<HomeDecksSection />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search decks or words..."),
      "missing",
    );

    expect(screen.queryByText("Travel words")).toBeNull();
    expect(screen.getByText("No decks match this search.")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByText("Travel words")).toBeTruthy();
    expect(screen.queryByText("No decks match this search.")).toBeNull();
  });

  it("creates a trimmed deck and opens its detail route", async () => {
    const createdDeck = createDeckSummary({
      id: "deck-2",
      isDefault: false,
      title: "Business English",
      wordCount: 0,
    });
    createDeck.mockResolvedValueOnce(createdDeck);
    render(<HomeDecksSection />);

    fireEvent.press(screen.getByRole("button", { name: "Create deck" }));
    fireEvent.changeText(
      screen.getByPlaceholderText("Deck name"),
      "  Business English  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Description"),
      "  Work vocabulary  ",
    );
    fireEvent.press(screen.getByRole("checkbox"));
    fireEvent.press(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createDeck).toHaveBeenCalledWith({
        title: "Business English",
        description: "Work vocabulary",
        isDefault: true,
      });
      expect(router.push).toHaveBeenCalledWith({
        pathname: "/decks/category/[deckId]",
        params: { deckId: "deck-2" },
      });
    });
  });
});

function createMutation(mutateAsync: jest.Mock) {
  return {
    error: null,
    isPending: false,
    mutateAsync,
  };
}

function createDecksQuery(
  items: DeckSummary[],
  overrides: Partial<{
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
  }> = {},
) {
  return {
    data: { items },
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchDecks,
    ...overrides,
  };
}

function createDeckSummary(overrides: Partial<DeckSummary> = {}): DeckSummary {
  return {
    id: "deck-1",
    title: "Travel words",
    description: "Useful travel vocabulary",
    isDefault: true,
    wordCount: 3,
    masteryScore: 6,
    maxMasteryScore: 15,
    progressPercent: 40,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-02T08:00:00.000Z",
    ...overrides,
  };
}
