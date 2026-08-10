/// <reference types="jest" />

import { authClient } from "@/auth";
import {
  addDeckWords,
  createDeck,
  deleteDeck,
  getDeck,
  listDecks,
  removeDeckWord,
} from "../api";
import type { AddDeckWordsRequest, CreateDeckRequest } from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const deleteMock = authClient.delete as jest.Mock;
const getMock = authClient.get as jest.Mock;
const postMock = authClient.post as jest.Mock;

describe("deck API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the current user's decks", async () => {
    const response = { items: [] };
    getMock.mockResolvedValue(response);

    await expect(listDecks()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/decks");
  });

  it("gets one deck by id", async () => {
    const response = { id: "deck-1", items: [] };
    getMock.mockResolvedValue(response);

    await expect(getDeck("deck-1")).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/decks/deck-1");
  });

  it("creates a deck with every supported field", async () => {
    const input: CreateDeckRequest = {
      title: "Travel",
      description: "Words for an upcoming trip",
      isDefault: true,
    };
    const response = { id: "deck-1" };
    postMock.mockResolvedValue(response);

    await expect(createDeck(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/decks", input);
  });

  it("deletes a deck without expecting a response body", async () => {
    deleteMock.mockResolvedValue(undefined);

    await expect(deleteDeck("deck-1")).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith("/decks/deck-1");
  });

  it("adds multiple words to a deck with the complete request body", async () => {
    const input: AddDeckWordsRequest = {
      words: [
        {
          sourceText: "book",
          targetText: "kitab",
          wordType: "NOUN",
          cefrLevel: "A1",
          definition: "A written work.",
          note: "Common noun",
        },
        {
          sourceText: "read",
          targetText: "oxumaq",
        },
      ],
    };
    const response = { id: "deck-1", items: [] };
    postMock.mockResolvedValue(response);

    await expect(addDeckWords("deck-1", input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/decks/deck-1/words", input);
  });

  it("removes a deck word without expecting a response body", async () => {
    deleteMock.mockResolvedValue(undefined);

    await expect(
      removeDeckWord("deck-1", "deck-card-1"),
    ).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith("/decks/deck-1/words/deck-card-1");
  });
});
