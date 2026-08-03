/// <reference types="jest" />

import { authClient } from "@/auth";
import {
  addMasteredCollectionWords,
  createMasteredCollection,
  deleteMasteredCollection,
  getMasteredCollection,
  listMasteredCollections,
  removeMasteredCollectionWord,
} from "../api";
import type {
  AddMasteredCollectionWordsRequest,
  CreateMasteredCollectionRequest,
} from "../model";

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

describe("mastered collection API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the current user's mastered collections", async () => {
    const response = { items: [] };
    getMock.mockResolvedValue(response);

    await expect(listMasteredCollections()).resolves.toBe(response);

    expect(getMock).toHaveBeenCalledWith("/mastered-collections");
  });

  it("gets one mastered collection by id", async () => {
    const response = { id: "collection-1", items: [] };
    getMock.mockResolvedValue(response);

    await expect(getMasteredCollection("collection-1")).resolves.toBe(
      response,
    );

    expect(getMock).toHaveBeenCalledWith(
      "/mastered-collections/collection-1",
    );
  });

  it("creates a mastered collection with every supported field", async () => {
    const input: CreateMasteredCollectionRequest = {
      title: "Travel words",
      description: "Words mastered while preparing for a trip",
    };
    const response = { id: "collection-1", items: [] };
    postMock.mockResolvedValue(response);

    await expect(createMasteredCollection(input)).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith("/mastered-collections", input);
  });

  it("adds multiple user words to a mastered collection", async () => {
    const input: AddMasteredCollectionWordsRequest = {
      userWordIds: ["user-word-1", "user-word-2"],
    };
    const response = { id: "collection-1", items: [] };
    postMock.mockResolvedValue(response);

    await expect(
      addMasteredCollectionWords("collection-1", input),
    ).resolves.toBe(response);

    expect(postMock).toHaveBeenCalledWith(
      "/mastered-collections/collection-1/words",
      input,
    );
  });

  it("removes a collection word without expecting a response body", async () => {
    deleteMock.mockResolvedValue(undefined);

    await expect(
      removeMasteredCollectionWord("collection-1", "collection-word-1"),
    ).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith(
      "/mastered-collections/collection-1/words/collection-word-1",
    );
  });

  it("deletes a mastered collection without expecting a response body", async () => {
    deleteMock.mockResolvedValue(undefined);

    await expect(
      deleteMasteredCollection("collection-1"),
    ).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith(
      "/mastered-collections/collection-1",
    );
  });
});
