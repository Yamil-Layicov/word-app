/// <reference types="jest" />

import { authClient } from "@/auth";
import {
  archiveVocabularyItem,
  createVocabularyItem,
  getVocabularyItem,
  listVocabularyItems,
  updateVocabularyItem,
} from "../api";
import type {
  CreateVocabularyItemRequest,
  UpdateVocabularyItemRequest,
  VocabularyItemsFilters,
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

describe("vocabulary item API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists vocabulary items with an empty query by default", async () => {
    const response = { items: [], nextCursor: null };
    getMock.mockResolvedValue(response);

    await expect(listVocabularyItems()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/vocabulary/items", {
      query: {},
    });
  });

  it("forwards every supported vocabulary list filter", async () => {
    const filters: VocabularyItemsFilters = {
      status: "MASTERED",
      isFavorite: true,
      search: "travel",
      limit: 25,
      cursor: "cursor-1",
    };

    await listVocabularyItems(filters);

    expect(getMock).toHaveBeenCalledWith("/vocabulary/items", {
      query: filters,
    });
  });

  it("gets one vocabulary item by id", async () => {
    const response = { id: "item-1" };
    getMock.mockResolvedValue(response);

    await expect(getVocabularyItem("item-1")).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/vocabulary/items/item-1");
  });

  it("creates a vocabulary item with the complete request body", async () => {
    const input: CreateVocabularyItemRequest = {
      sourceText: "book",
      targetText: "kitab",
      wordType: "NOUN",
      cefrLevel: "A1",
      definition: "A written work.",
      note: "Common noun",
      examples: [
        {
          sourceSentence: "This is a book.",
          targetSentence: "Bu kitabdir.",
        },
      ],
    };
    const response = { id: "item-1" };
    postMock.mockResolvedValue(response);

    await expect(createVocabularyItem(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/vocabulary/items", input);
  });

  it("updates one vocabulary item with the provided fields", async () => {
    const input: UpdateVocabularyItemRequest = {
      isFavorite: true,
      status: "MASTERED",
    };
    const response = { id: "item-1" };
    patchMock.mockResolvedValue(response);

    await expect(updateVocabularyItem("item-1", input)).resolves.toBe(response);

    expect(patchMock).toHaveBeenCalledWith("/vocabulary/items/item-1", input);
  });

  it("archives one vocabulary item without expecting a response body", async () => {
    deleteMock.mockResolvedValue(undefined);

    await expect(archiveVocabularyItem("item-1")).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith("/vocabulary/items/item-1");
  });
});
